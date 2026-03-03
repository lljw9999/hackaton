# ADA - AI Health Assistant

A voice-enabled AI companion designed for elderly care, providing continuous voice conversations with automatic check-ins and family contact access.

## Features

- 🎤 **Continuous Voice Conversations**: Fully hands-free - just talk naturally, no button pressing
- 🤖 **AI-Powered**: Uses OpenAI GPT-4o-mini for fast, emotional, caring responses
- 💬 **Automatic Logging**: Conversations saved to MongoDB + text files
- 👥 **Family Contacts**: Quick call buttons for Anthony (Son) and David (Daughter)
- 🎯 **Elderly-Focused**: Personalized for Jenny with emotional warmth and care
- 🌐 **Elder-Friendly UI**: Large buttons, high contrast, simple design

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure OpenAI API Key

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Then edit `.env` and add your OpenAI API key:

```
OPENAI_API_KEY=your_actual_api_key_here
PORT=3000
```

You can get an API key from [OpenAI's website](https://platform.openai.com/api-keys).

### 3. Start the Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

### 4. Open in Browser

Navigate to `http://localhost:3000` in your web browser.

## How to Use

1. Click **"Call ADA"** once to start
2. ADA greets: "Hey Jenny, I hope you are doing great today."
3. **Just talk naturally** - no button pressing needed
4. After 5 seconds of silence, your message auto-sends
5. ADA responds with voice automatically
6. Recording auto-resumes - continue talking!
7. Click "Call ADA" again to end the conversation

**Family Contacts:**

- Tap "Anthony" or "David" buttons to call them directly
- Calls open your phone dialer with their number pre-filled

## Project Structure

```
hackaton/
├── server.js              # Express backend server
├── package.json           # Node.js dependencies
├── .env                   # Environment variables (create this)
├── public/
│   ├── index.html        # Frontend HTML
│   ├── style.css         # Styling
│   └── app.js            # Frontend JavaScript
└── conversations/         # Auto-generated conversation logs
```

## Conversation Logs

All conversations are saved to text files in the `conversations/` directory, organized by date. Each file contains:

- Timestamp of each exchange
- User's spoken message
- ADA's response

## Key Features

- **Silence Detection**: Auto-sends after 5 seconds of silence (handles background noise)
- **Continuous Flow**: Talk → Pause → Hear Response → Talk Again (fully automatic)
- **Optimized Speed**: ~0.8-2.5 second response times
- **Graceful Fallback**: Works even if MongoDB is unavailable

## Documentation

- `COMPLETE_SYSTEM_SUMMARY.md` - Full system overview and architecture
- `DEPLOYMENT_GUIDE.md` - How to deploy to Vercel/Render/ngrok
- `MONGODB_SETUP.md` - Mo
ngoDB configuration
- `CHATGPT_PROMPT_PREDEFINED_QUESTIONS.md` - Prompt for adding medication/PT reminders
<img width="422" height="806" alt="Screenshot 2025-12-07 at 6 16 59 PM" src="https://github.com/user-attachments/assets/1e3e9602-bed0-41c5-abf3-4747254e3a01" />


<img width="1512" height="982" alt="Screenshot 2025-12-07 at 6 17 03 PM" src="https://github.com/user-attachments/assets/c265b4ab-1e0d-471b-9d1b-8d55221373cc" />





- **Microphone not working**: Check browser permissions and allow microphone access
- **API errors**: Verify your OpenAI API key is correct and has sufficient credits
- **Port already in use**: Change the PORT in `.env` file
