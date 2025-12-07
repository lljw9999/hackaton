import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

const {
  MONGO_URI = 'mongodb://localhost:27017',
  CONVERSATIONS_DB = 'conversations',
  ANALYTICS_COLLECTION = 'calltrackings',
  PORT = 4000,
} = process.env;

const app = express();
app.use(cors());

let analyticsCol;

const formatDoc = (doc) => {
  const metrics = doc?.metrics || {};
  return {
    patientId: doc?.patientId,
    conversationId: doc?._id || doc?.conversationId,
    createdAt: doc?.createdAt,
    overallHealth: {
      delta: metrics.overallHealth?.delta ?? 0,
      ...metrics.overallHealth,
    },
    moodTrend: metrics.moodTrend ?? [],
    conversationHistory: metrics.conversationHistory ?? [],
    topics: metrics.topics ?? [],
    conversationSummary: metrics.conversationSummary ?? {},
  };
};

app.get('/api/analytics/latest', async (_req, res) => {
  try {
    const doc = await analyticsCol.find().sort({ createdAt: -1, _id: -1 }).limit(1).next();
    if (!doc) {
      return res.status(404).json({ error: 'No analytics yet' });
    }
    res.json(formatDoc(doc));
  } catch (err) {
    console.error('Error fetching latest analytics', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

app.get('/api/analytics/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const sendDoc = (doc) => {
    res.write(`data: ${JSON.stringify(formatDoc(doc))}\n\n`);
  };

  // Push the latest on connect for immediate hydration
  const latest = await analyticsCol.find().sort({ createdAt: -1, _id: -1 }).limit(1).next();
  if (latest) {
    sendDoc(latest);
  }

  let changeStream;
  try {
    changeStream = analyticsCol.watch(
      [{ $match: { operationType: { $in: ['insert', 'replace', 'update'] } } }],
      { fullDocument: 'updateLookup' }
    );
    changeStream.on('change', (change) => {
      if (change.fullDocument) {
        sendDoc(change.fullDocument);
      }
    });
  } catch (err) {
    console.error('Error creating change stream', err);
    res.write(`event: error\ndata: ${JSON.stringify({ error: 'Change stream error' })}\n\n`);
    res.end();
    return;
  }

  req.on('close', () => {
    changeStream?.close();
    res.end();
  });
});

const start = async () => {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(CONVERSATIONS_DB);
    analyticsCol = db.collection(ANALYTICS_COLLECTION);
    app.listen(PORT, () => {
      console.log(`Analytics server ready on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start analytics server', err);
    process.exit(1);
  }
};

start();
