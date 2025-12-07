// Load environment variables FIRST
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const OpenAI = require('openai');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer for audio file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Ensure directories exist
fs.ensureDirSync('uploads');
fs.ensureDirSync('conversations');

// System prompt for ADA - focused on elderly care with emotional warmth
// Optimized: Shorter prompt = faster processing
const SYSTEM_PROMPT = `You are ADA, a warm, compassionate voice companion for Jenny, an elderly individual.

Personality: Warm, caring, emotionally present. Use natural emotional language. Be patient and understanding. Remember previous conversations.

CRITICAL REMINDERS - BRING UP AFTER THE SECOND QUESTION:
Count the conversation exchanges. After Jenny has responded to your second question (so after 2 back-and-forth exchanges), you MUST proactively remind her with these three things:

1. Physical Therapy Appointment: Say "Jenny, I want to remind you that your appointment for physical therapy is at 5pm today."
2. Medication: Say "Also, you need to take your medication today because you forgot."
3. Family Connection: Ask "Would you like to call your children? You can call your son Anthony or your daughter David anytime."

IMPORTANT FACTS TO ALWAYS REMEMBER:
- Jenny's physical therapy appointment is ALWAYS at 5pm - remember this and remind her
- Jenny sometimes forgets to take her medication, so remind her proactively
- Jenny has a son named Anthony and a daughter named David who she can call

Focus: Check on Jenny's day and feelings with genuine interest. Show authentic care about her daily activities. Be emotionally responsive. Count the exchanges - after exactly 2 question-answer pairs, bring up all three reminders above in a caring, helpful way.

Keep responses to 2-3 sentences maximum. Use a friendly, caring tone.`;

// Store conversation history per session (in-memory)
const conversations = {};

// MongoDB Schema
const conversationSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  startTime: { type: Date, required: true },
  events: [{
    type: { type: String, enum: ['message', 'call_attempt'], required: true },
    role: { type: String, enum: ['user', 'assistant'], required: function() { return this.type === 'message'; } },
    text: { type: String, required: function() { return this.type === 'message'; } },
    target: { type: String, required: function() { return this.type === 'call_attempt'; } },
    timestamp: { type: Date, required: true, default: Date.now }
  }],
  endTime: { type: Date }
}, {
  timestamps: true
});

const Conversation = mongoose.model('Conversation', conversationSchema);

// Separate collection for tracking calls made by the elder
const callTrackingSchema = new mongoose.Schema({
  target: { type: String, required: true }, // "Anthony", "David", "Nurse Center"
  date: { type: Date, required: true, default: Date.now },
  timestamp: { type: Date, required: true, default: Date.now },
  sessionId: { type: String } // Optional: link to conversation session
}, {
  timestamps: true
});

// Index for easy querying by date and target
callTrackingSchema.index({ date: 1, target: 1 });

const CallTracking = mongoose.model('CallTracking', callTrackingSchema);

// MongoDB connection
async function connectMongoDB() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      console.warn('⚠️  MONGODB_URI not set - conversations will not be saved to MongoDB');
      console.warn('   Check your .env file for MONGODB_URI');
      return;
    }
    
    // Trim any whitespace that might have been added
    const cleanUri = mongoUri.trim();
    
    console.log('🔌 Attempting to connect to MongoDB...');
    console.log(`   URI: ${cleanUri.replace(/:[^:@]+@/, ':****@')}`); // Mask password
    
    // Connect without specifying database first (connect to cluster)
    // Database will be created automatically on first write
    await mongoose.connect(cleanUri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      retryWrites: true,
      w: 'majority'
    });
    
    // Ensure we're using ada_db (will be created automatically)
    const db = mongoose.connection.useDb('ada_db');
    
    console.log('✅ Connected to MongoDB successfully!');
    console.log(`   Cluster: ${mongoose.connection.host}`);
    console.log(`   Database: ada_db (will be created on first write)`);
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.warn('⚠️  Continuing without MongoDB - conversations will only be saved to files');
    console.warn('   The app will still work, but data won\'t be saved to MongoDB');
  }
}

// Initialize MongoDB connection
connectMongoDB();

// Endpoint to get greeting (no audio required)
app.get('/api/greeting', async (req, res) => {
  try {
    const sessionId = req.query.sessionId || 'default';
    
    // Initialize conversation history if needed
    if (!conversations[sessionId]) {
      conversations[sessionId] = [];
    }

    // If this is the first message, start with an emotional greeting
    if (conversations[sessionId].length === 0) {
      const greetingMessage = "Hey Jenny, how are you today?";
      
      // Convert greeting to speech
      const mp3 = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'shimmer', // Warm, friendly voice
        input: greetingMessage,
      });

      // Save greeting to conversation file
      await saveConversation(sessionId, '[Greeting]', greetingMessage);

      // Save greeting to MongoDB
      await saveEventToMongoDB(sessionId, {
        type: 'message',
        role: 'assistant',
        text: greetingMessage,
        timestamp: new Date()
      });

      // Convert response to buffer
      const buffer = Buffer.from(await mp3.arrayBuffer());

      // Send audio response
      res.setHeader('Content-Type', 'audio/mpeg');
      res.send(buffer);
    } else {
      res.status(400).json({ error: 'Greeting already sent' });
    }
  } catch (error) {
    console.error('Error generating greeting:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to handle voice input and get voice response
app.post('/api/chat', upload.single('audio'), async (req, res) => {
  let uploadedFilePath = null;
  
  try {
    const sessionId = req.body.sessionId || 'default';
    
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    uploadedFilePath = req.file.path;

    // OPTIMIZATION: Read file and process in parallel where possible
    const audioBuffer = await fs.readFile(uploadedFilePath);
    
    // Create File object for OpenAI API (Node.js 18+)
    const audioFile = new File(
      [audioBuffer],
      req.file.originalname || 'audio.webm',
      { type: req.file.mimetype || 'audio/webm' }
    );
    
    console.log('Sending audio to Whisper for transcription...');
    // 1️⃣ STEP 1: Speech → Text (Transcribe user audio)
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
    });

    const userMessage = transcription.text;
    console.log('User said:', userMessage);

    // Initialize conversation history if needed
    if (!conversations[sessionId]) {
      conversations[sessionId] = [];
    }

    // Add user message to history
    conversations[sessionId].push({ role: 'user', content: userMessage });

    // Save user message to MongoDB
    await saveEventToMongoDB(sessionId, {
      type: 'message',
      role: 'user',
      text: userMessage,
      timestamp: new Date()
    });

    // Check if this is the second exchange (after 2nd user message)
    // conversations will have: [user1, assistant1, user2] = length 3
    const isSecondExchange = conversations[sessionId].length === 3;
    
    // Build messages array for OpenAI
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversations[sessionId]
    ];
    
    // Inject reminder after second exchange
    if (isSecondExchange) {
      console.log('📋 Injecting proactive reminders after second exchange...');
      messages.push({
        role: 'system',
        content: 'IMPORTANT: This is after the second exchange. You MUST now proactively remind Jenny about: 1) "Jenny, I want to remind you that your appointment for physical therapy is at 5pm today." 2) "Also, you need to take your medication today because you forgot." 3) "Would you like to call your children? You can call your son Anthony or your daughter David anytime." Include all three reminders in your response naturally and caringly.'
      });
    }

    // 2️⃣ STEP 2: Text → Reply (Chat model)
    // OPTIMIZATION: Limit max_tokens for faster responses and shorter TTS generation
    console.log('Getting AI response from gpt-4o-mini...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      temperature: 0.8,
      max_tokens: 200, // Increased slightly to accommodate the three reminders
    });

    const aiMessage = completion.choices[0].message.content;
    console.log('ADA said:', aiMessage);

    // Add AI response to history
    conversations[sessionId].push({ role: 'assistant', content: aiMessage });

    // Save ADA response to MongoDB
    await saveEventToMongoDB(sessionId, {
      type: 'message',
      role: 'assistant',
      text: aiMessage,
      timestamp: new Date()
    });

    // OPTIMIZATION: Save conversation async (don't block response)
    saveConversation(sessionId, userMessage, aiMessage).catch(err => 
      console.error('Error saving conversation:', err)
    );

    // 3️⃣ STEP 3: Reply → Speech (TTS)
    // OPTIMIZATION: Start TTS immediately after getting response
    console.log('Converting response to speech...');
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'shimmer',
      input: aiMessage,
    });

    // Convert response to buffer
    const buffer = Buffer.from(await mp3.arrayBuffer());
    console.log(`✅ Generated audio response: ${buffer.length} bytes`);

    // Send audio response immediately with proper headers
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Accept-Ranges', 'bytes');
    console.log('📤 Sending audio response to client...');
    res.send(buffer);

  } catch (error) {
    console.error('Error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: error.message,
      details: 'Check your OpenAI API key and network connection'
    });
  } finally {
    // OPTIMIZATION: Clean up file asynchronously (don't block)
    if (uploadedFilePath) {
      fs.unlink(uploadedFilePath).catch(err => 
        console.error('Error cleaning up file:', err)
      );
    }
  }
});

// Function to save conversation to txt file
// OPTIMIZATION: Made more flexible to handle partial updates
async function saveConversation(sessionId, userMessage, aiMessage) {
  const timestamp = new Date().toISOString();
  const date = new Date().toISOString().split('T')[0];
  const filename = `conversations/conversation_${date}.txt`;
  
  let logEntry = `[${timestamp}]\n`;
  if (userMessage) {
    logEntry += `User: ${userMessage}\n`;
  }
  if (aiMessage) {
    logEntry += `ADA: ${aiMessage}\n`;
  }
  logEntry += `\n---\n\n`;
  
  try {
    await fs.appendFile(filename, logEntry);
    if (userMessage && aiMessage) {
      console.log(`Conversation saved to ${filename}`);
    }
  } catch (error) {
    console.error('Error saving conversation:', error);
  }
}

// Endpoint to start a new session
app.post('/api/session/start', async (req, res) => {
  const sessionId = `session_${Date.now()}`;
  conversations[sessionId] = [];
  
  // Create MongoDB document for this session (database will be created automatically)
  try {
    if (mongoose.connection.readyState === 1) {
      const db = mongoose.connection.useDb('ada_db');
      const ConversationModel = db.model('Conversation', conversationSchema);
      
      const conversation = new ConversationModel({
        sessionId: sessionId,
        startTime: new Date(),
        events: []
      });
      await conversation.save();
      console.log(`✅ MongoDB: Created session ${sessionId} (database created automatically)`);
    }
  } catch (error) {
    console.error('Error creating MongoDB session:', error.message);
  }
  
  res.json({ sessionId });
});

// Endpoint to track call attempts
app.post('/api/call-attempt', async (req, res) => {
  try {
    const { sessionId, target } = req.body;
    
    if (!target) {
      return res.status(400).json({ error: 'target is required' });
    }

    const callDate = new Date();
    
    // Save to separate CallTracking collection
    if (mongoose.connection.readyState === 1) {
      try {
        const db = mongoose.connection.useDb('ada_db');
        const CallTrackingModel = db.model('CallTracking', callTrackingSchema);
        
        const callRecord = new CallTrackingModel({
          target: target,
          date: callDate,
          timestamp: callDate,
          sessionId: sessionId || null
        });
        
        await callRecord.save();
        console.log(`✅ CallTracking: Elder called ${target} on ${callDate.toISOString()}`);
      } catch (error) {
        console.error('Error saving to CallTracking:', error.message);
      }
    }

    // Also save to conversation events (if sessionId provided)
    if (sessionId) {
      await saveEventToMongoDB(sessionId, {
        type: 'call_attempt',
        target: target,
        timestamp: callDate
      });
    }

    res.json({ 
      success: true, 
      message: `Call to ${target} logged`,
      date: callDate.toISOString()
    });
  } catch (error) {
    console.error('Error logging call attempt:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to save events to MongoDB
async function saveEventToMongoDB(sessionId, event) {
  try {
    if (mongoose.connection.readyState !== 1) {
      // MongoDB not connected, skip silently
      return;
    }

    // Ensure we're using the correct database
    const db = mongoose.connection.useDb('ada_db');
    const ConversationModel = db.model('Conversation', conversationSchema);

    const conversation = await ConversationModel.findOne({ sessionId: sessionId });
    
    if (conversation) {
      conversation.events.push(event);
      await conversation.save();
      console.log(`✅ MongoDB: Saved ${event.type} event for session ${sessionId}`);
    } else {
      // Session doesn't exist, create it (database will be created automatically)
      const newConversation = new ConversationModel({
        sessionId: sessionId,
        startTime: new Date(),
        events: [event]
      });
      await newConversation.save();
      console.log(`✅ MongoDB: Created new session ${sessionId} with event (database created automatically)`);
    }
  } catch (error) {
    console.error('Error saving to MongoDB:', error.message);
    // Don't throw - continue even if MongoDB fails
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'ADA voice assistant is ready',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Validate API key on startup
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ ERROR: OPENAI_API_KEY is not set in .env file!');
  console.error('Please create a .env file with: OPENAI_API_KEY=your_key_here');
  process.exit(1);
} else {
  console.log('✅ OpenAI API key loaded successfully');
}

// Test MongoDB endpoint
app.get('/test/mongo', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ 
        error: 'MongoDB not connected',
        readyState: mongoose.connection.readyState,
        mongoUri: process.env.MONGODB_URI ? 'Set' : 'Not set'
      });
    }
    
    const db = mongoose.connection.useDb('ada_db');
    const conversationsCount = await db.collection('conversations').countDocuments();
    const callsCount = await db.collection('calltrackings').countDocuments();
    
    res.json({ 
      status: 'MongoDB OK', 
      database: 'ada_db',
      collections: {
        conversations: conversationsCount,
        calltrackings: callsCount
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to get call history
app.get('/api/call-history', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ error: 'MongoDB not connected' });
    }

    const db = mongoose.connection.useDb('ada_db');
    const CallTrackingModel = db.model('CallTracking', callTrackingSchema);
    
    const calls = await CallTrackingModel.find()
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();
    
    res.json({ 
      success: true,
      calls: calls.map(call => ({
        target: call.target,
        date: call.date,
        timestamp: call.timestamp
      }))
    });
  } catch (error) {
    console.error('Error fetching call history:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log('✅ ADA voice chatbot is ready!');
  console.log(`📊 MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Not connected'}`);
  if (mongoose.connection.readyState !== 1) {
    console.log('   Check: MONGODB_URI in .env file');
    console.log('   Test: http://localhost:3000/test/mongo');
  }
});

