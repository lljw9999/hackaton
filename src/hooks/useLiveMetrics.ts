import { useEffect, useMemo, useState } from 'react';
import {
  conversationHistory as fallbackConversationHistory,
  conversationSummary as fallbackConversationSummary,
  moodTrend as fallbackMoodTrend,
  overallHealth as fallbackHealth,
  topics as fallbackTopics,
} from '../data/patient';

export type CallLog = {
  id: string;
  recipientName: string;
  recipientPhone?: string | null;
  callerName: string;
  startTime: string;
  endTime?: string | null;
  duration?: number | null;
  status: string;
  direction: string;
  summary?: string | null;
};

export type Metrics = {
  overallHealth: { score: number; delta?: number; summary?: string };
  moodTrend: { label: string; value: number }[];
  conversationHistory: { label: string; count: number; avgMinutes: number; longestMinutes: number }[];
  topics: { name: string; sentiment: string; percent: number }[];
  conversationSummary: { headline?: string; highlights?: string[]; followUps?: string[] };
  transcript?: string | null;
  analyzedAt?: string | null;
  callLogs: CallLog[];
};

const fallbackMetrics: Metrics = {
  overallHealth: fallbackHealth,
  moodTrend: fallbackMoodTrend,
  conversationHistory: fallbackConversationHistory,
  topics: fallbackTopics,
  conversationSummary: fallbackConversationSummary,
  transcript: null,
  analyzedAt: null,
  callLogs: [],
};

const mergeMetrics = (incoming: Partial<Metrics>): Metrics => ({
  overallHealth: { ...fallbackMetrics.overallHealth, ...incoming.overallHealth },
  moodTrend: incoming.moodTrend?.length ? incoming.moodTrend : fallbackMetrics.moodTrend,
  conversationHistory: incoming.conversationHistory?.length
    ? incoming.conversationHistory
    : fallbackMetrics.conversationHistory,
  topics: incoming.topics?.length ? incoming.topics : fallbackMetrics.topics,
  conversationSummary: { ...fallbackMetrics.conversationSummary, ...incoming.conversationSummary },
  transcript: incoming.transcript ?? fallbackMetrics.transcript,
  analyzedAt: incoming.analyzedAt ?? fallbackMetrics.analyzedAt,
  callLogs: incoming.callLogs ?? fallbackMetrics.callLogs,
});

export default function useLiveMetrics() {
  const [metrics, setMetrics] = useState<Metrics>(fallbackMetrics);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        // Fetch patient data and call logs in parallel
        const [patientRes, callLogsRes] = await Promise.all([
          fetch('http://localhost:3001/api/patient-data'),
          fetch('http://localhost:3001/api/call-logs'),
        ]);

        if (!patientRes.ok) throw new Error(`patient-data status ${patientRes.status}`);
        const patientData = (await patientRes.json()) as Partial<Metrics>;
        
        let callLogs: CallLog[] = [];
        if (callLogsRes.ok) {
          const callData = await callLogsRes.json();
          callLogs = callData.calls || [];
        }

        console.log('✅ Loaded live data from MongoDB:', { ...patientData, callLogs });
        if (!cancelled) {
          setMetrics((prev) => mergeMetrics({ ...prev, ...patientData, callLogs }));
        }
      } catch (err) {
        console.warn('Falling back to mock data; fetch failed', err);
      }
    };

    // Poll for updates every 5 seconds
    const poll = () => {
      if (!cancelled) {
        hydrate();
      }
    };

    hydrate();
    const interval = setInterval(poll, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return useMemo(() => metrics, [metrics]);
}
