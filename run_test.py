#!/usr/bin/env python3
import json
import sys
from scripts.analyze_transcript import analyze_transcript

if __name__ == "__main__":
    result = analyze_transcript("test.txt", model="gpt-4o-mini")
    print(json.dumps(result, indent=2))
