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
