# ChatGPT Prompt: Adding Predefined Questions to ADA

Copy and paste this prompt to ChatGPT to get help implementing predefined questions:

---

## Prompt for ChatGPT:

```
I have a voice assistant application called ADA built with Node.js, Express, and OpenAI APIs.
The assistant talks to an elderly person named Jenny through voice conversations.

Current Setup:
- Frontend: Vanilla JavaScript with voice recording and silence detection
- Backend: Express server with OpenAI Whisper (speech-to-text), GPT-4o-mini (chat), and TTS (text-to-speech)
- Conversation flow: User speaks → 5s silence → auto-sends → ADA responds → auto-resumes
- System prompt: ADA is a warm, compassionate voice companion for Jenny

I want to add PRE-DEFINED QUESTIONS that ADA asks automatically at specific times or conditions:

1. Medication Reminder: "Hey Jenny, did you take your medication today?"
2. Physical Therapy Check-in: "Did you attend your physical therapy at 5 PM?"

Requirements:
- Questions should be asked naturally in conversation (not robotic)
- Should integrate with the existing conversation flow
- Can be time-based (e.g., ask about medication in the morning, PT at 5 PM)
- Should feel like ADA is genuinely checking in, not just reading a script
- Questions should be asked once per day (not repeatedly)
- Should work with the existing MongoDB logging system

Current code structure:
- Backend: server.js with /api/chat endpoint that handles voice input
- Frontend: app.js handles recording and playback
- MongoDB: Stores conversations with sessionId, events array, timestamps
- System prompt defines ADA's personality

Please provide:
1. Code implementation for time-based question triggers
2. How to integrate with existing conversation flow
3. How to track which questions have been asked today (to avoid repetition)
4. How to make questions feel natural and conversational
5. Where to store predefined questions (config file, database, etc.)
6. How to handle if Jenny doesn't answer or gives unclear responses

The questions should feel like ADA is genuinely caring about Jenny's well-being, not like a checklist.
```

---

## Additional Context to Add (if needed):

```
Technical Details:
- Server: Express.js on Node.js
- Session management: Each page load creates a new sessionId
- Conversation history: Stored in-memory per session, also saved to MongoDB
- Current greeting: "Hey Jenny, I hope you are doing great today."
- Silence detection: 5 seconds triggers auto-send
- MongoDB schema: { sessionId, startTime, events: [{type, role, text, timestamp}], endTime }
```

---

## Expected Implementation Areas:

1. **Time-based triggers** - Check current time and ask questions at appropriate moments
2. **Question tracking** - Store which questions were asked today (MongoDB or file)
3. **Natural integration** - Weave questions into conversation flow
4. **Response handling** - Process Jenny's answers about medication/PT
5. **Follow-up logic** - ADA's responses based on Jenny's answers

---

Use this prompt with ChatGPT to get detailed implementation guidance!
