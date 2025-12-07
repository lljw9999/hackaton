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
    // Sorting by analyzedAt descending
    const latestAnalysis = await db.collection('conversation_semantics')
      .find({})
      .sort({ analyzedAt: -1 })
      .limit(1)
      .toArray();

    if (latestAnalysis.length === 0) {
      return res.status(404).json({ error: 'No data found' });
    }

    // Include transcript if available
    const result = {
      ...latestAnalysis[0].analysis,
      transcript: latestAnalysis[0].transcript || null,
      analyzedAt: latestAnalysis[0].analyzedAt || null,
    };

    res.json(result);
  } catch (err) {
    console.error('Error fetching data', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get latest transcript
app.get('/api/transcript', async (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Database not connected' });
  }

  try {
    const latestAnalysis = await db.collection('conversation_semantics')
      .find({})
      .sort({ analyzedAt: -1 })
      .limit(1)
      .toArray();

    if (latestAnalysis.length === 0) {
      return res.status(404).json({ error: 'No transcript found' });
    }

    res.json({
      transcript: latestAnalysis[0].transcript || 'No transcript available',
      analyzedAt: latestAnalysis[0].analyzedAt || null,
    });
  } catch (err) {
    console.error('Error fetching transcript', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
