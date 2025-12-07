import express from 'express';
console.log("Starting server.js...");
import { MongoClient } from 'mongodb';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
// Use explicit connection string to bypass SRV DNS issues
const mongoUri = 'mongodb://ADA:JOCxymPsM8ZuElfe@ac-bccaoug-shard-00-00.iac9go2.mongodb.net:27017,ac-bccaoug-shard-00-01.iac9go2.mongodb.net:27017,ac-bccaoug-shard-00-02.iac9go2.mongodb.net:27017/?replicaSet=atlas-5qbkkh-shard-0&ssl=true&authSource=admin';

// const mongoUri = process.env.MONGODB_URI;

// if (!mongoUri) {
//   console.error('MONGODB_URI is not defined in .env');
//   process.exit(1);
// }

app.use(cors());
app.use(express.json());

let db;

async function connectDB() {
  try {
    const client = new MongoClient(mongoUri, { 
      tlsAllowInvalidCertificates: true,
      family: 4
    });
    await client.connect();
    db = client.db('ada_db');
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    // process.exit(1); // Keep server running for debugging
  }
}

connectDB();

app.get('/api/patient-data', async (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Database not connected' });
  }

  try {
    // Fetch the most recent semantic analysis
    const latestAnalysis = await db.collection('conversation_semantics')
      .find({})
      .sort({ analyzedAt: -1 })
      .limit(1)
      .toArray();

    if (latestAnalysis.length === 0) {
      return res.status(404).json({ error: 'No data found' });
    }

    // Get the latest conversation with events to build transcript
    let transcript = null;
    let conversationDate = null;

    const latestConversation = await db.collection('conversations')
      .find({ events: { $exists: true, $not: { $size: 0 } } })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();

    if (latestConversation.length > 0) {
      const conv = latestConversation[0];
      conversationDate = conv.createdAt || conv.startTime;
      
      // Build transcript from events array
      if (conv.events && Array.isArray(conv.events)) {
        transcript = conv.events
          .filter(e => e.type === 'message' && e.text)
          .map(e => {
            const speaker = e.role === 'assistant' ? 'Ada' : 'Patient';
            return `${speaker}: ${e.text}`;
          })
          .join('\n\n');
      }
    }

    const result = {
      ...latestAnalysis[0].analysis,
      transcript: transcript,
      analyzedAt: latestAnalysis[0].analyzedAt || conversationDate || null,
    };

    res.json(result);
  } catch (err) {
    console.error('Error fetching data', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get latest transcript - build from events array
app.get('/api/transcript', async (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Database not connected' });
  }

  try {
    const latestConversation = await db.collection('conversations')
      .find({ events: { $exists: true, $not: { $size: 0 } } })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();

    if (latestConversation.length === 0) {
      return res.json({ transcript: null, createdAt: null });
    }

    const conv = latestConversation[0];
    let transcript = null;

    // Build transcript from events array
    if (conv.events && Array.isArray(conv.events)) {
      transcript = conv.events
        .filter(e => e.type === 'message' && e.text)
        .map(e => {
          const speaker = e.role === 'assistant' ? 'Ada' : 'Patient';
          return `${speaker}: ${e.text}`;
        })
        .join('\n\n');
    }

    res.json({
      transcript: transcript,
      createdAt: conv.createdAt || conv.startTime,
      sessionId: conv.sessionId,
    });
  } catch (err) {
    console.error('Error fetching transcript', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Debug endpoint to see collection structure
app.get('/api/debug/collections', async (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Database not connected' });
  }

  try {
    const collections = await db.listCollections().toArray();
    const result = {};
    
    for (const col of collections) {
      const sample = await db.collection(col.name).findOne({});
      result[col.name] = {
        fields: sample ? Object.keys(sample) : [],
        sample: sample,
      };
    }

    res.json(result);
  } catch (err) {
    console.error('Error in debug', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get call tracking data
app.get('/api/call-logs', async (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Database not connected' });
  }

  try {
    // Fetch recent calls from calltrackings collection (plural)
    const callLogs = await db.collection('calltrackings')
      .find({})
      .sort({ createdAt: -1, date: -1, timestamp: -1 })
      .limit(20)
      .toArray();

    // Format the call logs based on actual schema
    // Schema: { target, date, timestamp, sessionId, createdAt, updatedAt }
    const formattedLogs = callLogs.map(call => ({
      id: call._id?.toString() || call.sessionId,
      recipientName: call.target || call.recipientName || call.patientName || 'Unknown',
      recipientPhone: call.phoneNumber || call.recipientPhone || null,
      callerName: call.callerName || call.from || 'Ada',
      startTime: call.date || call.timestamp || call.createdAt,
      endTime: call.endTime || null,
      duration: call.duration || call.durationSeconds || null,
      status: call.status || 'completed',
      direction: call.direction || 'outbound',
      summary: call.summary || call.notes || null,
      sessionId: call.sessionId || null,
    }));

    res.json({
      calls: formattedLogs,
      totalCalls: callLogs.length,
    });
  } catch (err) {
    console.error('Error fetching call logs', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
