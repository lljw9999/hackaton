import argparse
import json
import os
import sys
from typing import Dict

from openai import OpenAI


def load_env(path: str = ".env") -> None:
  """Lightweight .env loader to pull OPENAI_API_KEY into the environment."""
  if not os.path.exists(path):
    return
  with open(path, "r", encoding="utf-8") as env_file:
    for line in env_file:
      line = line.strip()
      if not line or line.startswith("#") or "=" not in line:
        continue
      key, value = line.split("=", 1)
      os.environ.setdefault(key.strip(), value.strip())


def build_messages(transcript: str):
  schema = """
  Return a JSON object with exactly these keys:
  {
    "overallHealth": { "score": int 0-100, "summary": string },
    "moodTrend": [ { "label": string short (e.g., Mon/Tue), "value": int 0-100 } ] (7 points, oldest to newest),
    "conversationHistory": [
      { "label": string short day label, "count": int num conversations, "avgMinutes": int rounded, "longestMinutes": int rounded }
    ] (7 entries),
    "topics": [ { "name": string, "sentiment": "positive"|"steady"|"cautious", "percent": int 1-100 } ] (3-6 items, percents sum near 100),
    "conversationSummary": { "headline": string, "highlights": [string], "followUps": [string] }
  }
  Keep language concise, encouraging, and clinically neutral. If the transcript lacks exact counts or minutes, estimate conservatively based on tone and pacing hints. Avoid extra keys or prose outside JSON.
  """

  return [
    {
      "role": "system",
      "content": (
        "You are AdaHealth's voice analytics agent. Analyze the transcript to score mood, summarize themes, "
        "and derive conversation cadence for a single patient. Respond with strict JSON only."
      ),
    },
    {"role": "user", "content": schema + "\nTranscript begins:\n" + transcript.strip()},
  ]


def analyze_transcript(transcript_path: str, model: str) -> Dict:
  load_env()
  api_key = os.environ.get("OPENAI_API_KEY")
  if not api_key:
    raise RuntimeError("OPENAI_API_KEY not set. Add it to your environment or .env file.")

  with open(transcript_path, "r", encoding="utf-8") as f:
    transcript = f.read()
  if not transcript.strip():
    raise ValueError("Transcript file is empty.")

  client = OpenAI(api_key=api_key)
  messages = build_messages(transcript)

  completion = client.chat.completions.create(
    model=model,
    messages=messages,
    response_format={"type": "json_object"},
    temperature=1,
  )

  content = completion.choices[0].message.content
  try:
    return json.loads(content)
  except json.JSONDecodeError as exc:
    raise ValueError(f"Model response was not valid JSON: {content}") from exc


def main():
  parser = argparse.ArgumentParser(
    description="Analyze a conversation transcript and emit AdaHealth dashboard metrics as JSON."
  )
  parser.add_argument("transcript", help="Path to plain text transcript file.")
  parser.add_argument(
    "--model",
    default="gpt-5-mini",
    help="OpenAI model to use (default: gpt-4o-mini).",
  )
  parser.add_argument(
    "--out",
    help="Optional path to write the JSON output. Prints to stdout if omitted.",
  )
  args = parser.parse_args()

  try:
    result = analyze_transcript(args.transcript, args.model)
  except Exception as exc:  # pragma: no cover - CLI surfacing
    print(f"Error: {exc}", file=sys.stderr)
    sys.exit(1)

  if args.out:
    with open(args.out, "w", encoding="utf-8") as f:
      json.dump(result, f, indent=2)
    print(f"Wrote analysis to {args.out}")
  else:
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
  main()
