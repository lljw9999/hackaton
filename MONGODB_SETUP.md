# MongoDB Setup Guide

## Quick Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Add MongoDB Connection String to `.env`

You need to add your MongoDB connection string to the `.env` file.

**Format for MongoDB Atlas (Cloud):**

```
MONGODB_URI=mongodb+srv://ad04_db_user:5ii9mBx9QBvj7UO@cluster.mongodb.net/database?retryWrites=true&w=majority
```

**Format for Local MongoDB:**

```
MONGODB_URI=mongodb://ad04_db_user:5ii9mBx9QBvj7UO@localhost:27017/ada_db
```

### 3. Get Your Full Connection String

**If using MongoDB Atlas:**

1. Go to https://cloud.mongodb.com
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Copy the connection string
5. Replace `<password>` with: `5ii9mBx9QBvj7UO`
6. Replace `<database>` with your database name (e.g., `ada_db`)

**Example:**

```
MONGODB_URI=mongodb+srv://ad04_db_user:5ii9mBx9QBvj7UO@cluster0.xxxxx.mongodb.net/ada_db?retryWrites=true&w=majority
```

### 4. Update `.env` File

Add this line to your `.env` file:

```
MONGODB_URI=your_full_connection_string_here
```

### 5. Restart Server

```bash
npm start
```

You should see:

```
✅ Connected to MongoDB
🚀 Server running on http://localhost:3000
✅ ADA voice chatbot is ready!
📊 MongoDB: Connected
```

---

## What Gets Saved to MongoDB

### Document Structure:

```javascript
{
  sessionId: "session_1234567890",
  startTime: "2024-12-07T20:10:22Z",
  events: [
    {
      type: "message",
      role: "user",
      text: "Hi ADA, how are you?",
      timestamp: "2024-12-07T20:10:25Z"
    },
    {
      type: "message",
      role: "assistant",
      text: "Hello Jenny! How are you feeling today?",
      timestamp: "2024-12-07T20:10:27Z"
    },
    {
      type: "call_attempt",
      target: "Anthony",
      timestamp: "2024-12-07T20:12:10Z"
    }
  ],
  endTime: "2024-12-07T20:15:12Z"  // Set when session ends
}
```

### Events Tracked:

1. **Messages**: Every user message and ADA response
2. **Call Attempts**: When Jenny taps Anthony, David, or Nurse Center

---

## Troubleshooting

### MongoDB Not Connecting?

- Check your connection string format
- Make sure password is URL-encoded (spaces = %20)
- For Atlas: Check IP whitelist (add 0.0.0.0/0 for testing)
- Check network/firewall settings

### App Works But No Data Saved?

- Check server console for MongoDB errors
- Verify MONGODB_URI is in `.env` file
- Check MongoDB connection status: `GET /api/health`

### Graceful Degradation

- If MongoDB fails, the app continues working
- Conversations still saved to text files
- No errors shown to users

---

## Testing

1. Start a conversation with ADA
2. Check MongoDB for new document with sessionId
3. Tap a contact button (Anthony/David/Nurse)
4. Check MongoDB for `call_attempt` event

---

## Viewing Data

### MongoDB Compass (GUI):

1. Download: https://www.mongodb.com/products/compass
2. Connect using your connection string
3. Browse `conversations` collection

### MongoDB Shell:

```bash
mongosh "your_connection_string"
use ada_db
db.conversations.find().pretty()
```
