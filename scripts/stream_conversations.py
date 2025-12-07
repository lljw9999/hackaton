"""
Watch the MongoDB conversations collection and push semantic analytics to a companion collection.

Assumptions:
- Each conversation document has either a `transcript` string field or a `transcript_path` pointing to a .txt file.
- MongoDB is running with replica set enabled (required for change streams).
- OPENAI_API_KEY, MONGO_URI, and optional collection env vars live in .env.
"""

import argparse
import os
import sys
from datetime import datetime
from typing import Optional

from pymongo import MongoClient
from pymongo.errors import PyMongoError

from analyze_transcript import analyze_text, load_env


def get_config():
  load_env()
  return {
    "mongo_uri": os.environ.get("MONGO_URI", "mongodb://localhost:27017"),
    "db_name": os.environ.get("CONVERSATIONS_DB", "conversations"),
    "source_collection": os.environ.get("CONVERSATIONS_COLLECTION", "conversations"),
    "analytics_collection": os.environ.get("ANALYTICS_COLLECTION", "calltrackings"),
    "model": os.environ.get("OPENAI_MODEL", "gpt-5-mini"),
  }


def extract_transcript(doc: dict) -> Optional[str]:
  if not doc:
    return None
  if isinstance(doc.get("transcript"), str):
    return doc["transcript"]
  transcript_path = doc.get("transcript_path")
  if isinstance(transcript_path, str) and os.path.exists(transcript_path):
    with open(transcript_path, "r", encoding="utf-8") as f:
      return f.read()
  return None


def handle_document(doc: dict, analytics_col, model: str):
  transcript = extract_transcript(doc)
  if not transcript:
    print(f"Skipping document {_id(doc)}: no transcript found", file=sys.stderr)
    return

  metrics = analyze_text(transcript, model=model)

  payload = {
    "conversationId": doc.get("_id"),
    "patientId": doc.get("patientId"),
    "createdAt": datetime.utcnow(),
    "metrics": metrics,
  }
  analytics_col.insert_one(payload)
  print(f"Analyzed and stored metrics for conversation {_id(doc)}")


def _id(doc: dict):
  return doc.get("_id")


def watch_loop(source_col, analytics_col, model: str):
  pipeline = [
    {"$match": {"operationType": {"$in": ["insert", "update", "replace"]}}},
  ]
  try:
    with source_col.watch(pipeline, full_document="updateLookup") as stream:
      print("Watching for new or updated conversations...")
      for change in stream:
        doc = change.get("fullDocument")
        handle_document(doc, analytics_col, model)
  except PyMongoError as exc:
    print(f"MongoDB error while watching: {exc}", file=sys.stderr)
    sys.exit(1)


def backfill(source_col, analytics_col, model: str, limit: Optional[int]):
  cursor = source_col.find().sort([("_id", -1)])
  if limit:
    cursor = cursor.limit(limit)
  for doc in cursor:
    handle_document(doc, analytics_col, model)


def main():
  parser = argparse.ArgumentParser(description="Stream conversation transcripts to OpenAI and store semantic metrics.")
  parser.add_argument(
    "--mode",
    choices=["watch", "backfill"],
    default="watch",
    help="watch: listen to new inserts/updates; backfill: process existing docs once.",
  )
  parser.add_argument(
    "--limit",
    type=int,
    help="Optional limit when running in backfill mode (most recent first).",
  )
  parser.add_argument(
    "--model",
    help="Override OpenAI model (defaults to OPENAI_MODEL env or gpt-5-mini).",
  )
  args = parser.parse_args()

  cfg = get_config()
  model = args.model or cfg["model"]

  try:
    client = MongoClient(cfg["mongo_uri"])
    db = client[cfg["db_name"]]
    source_col = db[cfg["source_collection"]]
    analytics_col = db[cfg["analytics_collection"]]
  except PyMongoError as exc:
    print(f"MongoDB connection error: {exc}", file=sys.stderr)
    sys.exit(1)

  if args.mode == "backfill":
    backfill(source_col, analytics_col, model, args.limit)
  else:
    watch_loop(source_col, analytics_col, model)


if __name__ == "__main__":
  main()
