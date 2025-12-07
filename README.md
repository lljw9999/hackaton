# AdaHealth Patient Dashboard

Lightweight Vite + React single-patient dashboard for AdaHealth&apos;s voice companion. It visualizes semantic health scores, mood trajectory, conversation cadence/length, topics, and an agent-written recap with follow-ups.

## Running locally

```bash
npm install
npm run dev
```

The dev server defaults to http://localhost:5173.

## Project notes

- Stack: Vite, React, TypeScript, minimal custom SVG + CSS for sparklines and bars.
- Data is mocked in `src/data/patient.ts`; replace with live API responses as needed.
- Styles live in `src/index.css` with a small component library in `src/components`.
- Dashboard pulls live metrics from `/api/analytics/*` (served by the local Node API) and streams updates over SSE.

## Transcript analysis script

A lightweight helper to turn a plain-text conversation transcript into the JSON shape expected by the dashboard.

1. Add your API key to `.env`:

```
OPENAI_API_KEY=sk-...
```

2. Install the Python dependency:

```
pip install openai
```

3. Run the analyzer:

```
python scripts/analyze_transcript.py path/to/transcript.txt --model gpt-4o-mini --out output.json
```

It returns `overallHealth`, `moodTrend`, `conversationHistory`, `topics`, and `conversationSummary` matching `src/data/patient.ts` so you can swap in live data.

## Mongo -> semantic analytics stream

Push new conversation transcripts into Mongo and automatically write the analyzed metrics to a companion collection.

1. Add to `.env`:
```
OPENAI_API_KEY=sk-...
MONGO_URI=mongodb://localhost:27017
CONVERSATIONS_DB=conversations
CONVERSATIONS_COLLECTION=conversations
ANALYTICS_COLLECTION=calltrackings
# Optional: OPENAI_MODEL=gpt-5-mini
```

2. Install deps:
```
pip install openai pymongo
```

3. Run the watcher (requires Mongo replica set for change streams):
```
python scripts/stream_conversations.py --mode watch
```

To process existing docs once, use:
```
python scripts/stream_conversations.py --mode backfill --limit 50
```

Each new conversation doc with a `transcript` string (or `transcript_path` to a .txt file) is analyzed via `analyze_transcript` and persisted to the `ANALYTICS_COLLECTION` with metrics that match the dashboard shape.

## Live API for the dashboard

The frontend expects the latest metrics at `/api/analytics/latest` and live updates from `/api/analytics/stream`.

1. Ensure MongoDB is running as a replica set and `.env` has the same `MONGO_URI`, `CONVERSATIONS_DB`, and `ANALYTICS_COLLECTION` (default `calltrackings`).
2. Start the API server:
```
npm run api
```
This serves on http://localhost:4000 by default (set `PORT` to override). Start the Vite app separately with `npm run dev`.

## Quick seeding for tests

To drop in synthetic conversations for the watcher to process:
```
python scripts/seed_conversations.py
```
This inserts three sample transcripts into `CONVERSATIONS_COLLECTION` so `stream_conversations.py` can pick them up (via backfill or live watch) and write analyzed records into `ANALYTICS_COLLECTION`.
