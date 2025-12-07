"""
Seed synthetic conversations into MongoDB to exercise the watcher.

Prereqs:
- Mongo replica set is running and accessible via MONGO_URI.
- .env contains MONGO_URI and optional DB/collection overrides.
"""

import os
from datetime import datetime, timedelta

from pymongo import MongoClient

from analyze_transcript import load_env


def get_config():
  load_env()
  return {
    "mongo_uri": os.environ.get("MONGO_URI", "mongodb://localhost:27017"),
    "db_name": os.environ.get("CONVERSATIONS_DB", "conversations"),
    "collection": os.environ.get("CONVERSATIONS_COLLECTION", "conversations"),
  }


def synthetic_conversations():
  now = datetime.utcnow()
  return [
    {
      "patientId": "marian-powell",
      "createdAt": now,
      "transcript": """Ada: Good morning, Marian! How are you feeling today?
Marian: Hi Ada. I'm calmer than yesterday. I slept almost 7 hours, only woke up once for water.
Ada: Great to hear. Did you stretch before getting up?
Marian: Yes, I did the ankle rolls you suggested. My balance felt steady.
Ada: Any pain?
Marian: No pain, just a bit stiff in the shoulders.
Ada: Let's do some gentle circles later. Did you remember morning meds?
Marian: Took them at 8:10 with tea."""
    },
    {
      "patientId": "marian-powell",
      "createdAt": now - timedelta(hours=5),
      "transcript": """Ada: Checking in after lunch. How was your meal?
Marian: Light—soup and half a sandwich. I'm making sure to drink water.
Ada: Energy level?
Marian: A bit tired, but mood is good. I called my granddaughter and it cheered me up.
Ada: Lovely. Any dizziness when standing?
Marian: Only once, when I got up fast. I sat back down and tried again slowly, no issue."""
    },
    {
      "patientId": "marian-powell",
      "createdAt": now - timedelta(days=1),
      "transcript": """Ada: Evening check-in. How was your day?
Marian: Quiet. I read and listened to music. Mood was steady.
Ada: Hydration?
Marian: I had 6 glasses of water. I could do one more before bed.
Ada: Sleep plan?
Marian: I'll dim lights at 9:30 and do the breathing exercise.
Ada: Perfect. Any concerns?
Marian: None. Just want to keep balance practice going."""
    },
  ]


def main():
  cfg = get_config()
  client = MongoClient(cfg["mongo_uri"])
  col = client[cfg["db_name"]][cfg["collection"]]
  docs = synthetic_conversations()
  result = col.insert_many(docs)
  print(f"Inserted {len(result.inserted_ids)} synthetic conversations into {cfg['db_name']}.{cfg['collection']}")


if __name__ == "__main__":
  main()
