import { useEffect, useMemo, useState } from 'react';
import {
  conversationHistory as fallbackConversationHistory,
  conversationSummary as fallbackConversationSummary,
  moodTrend as fallbackMoodTrend,
  overallHealth as fallbackHealth,
  topics as fallbackTopics,
} from '../data/patient';

export type Metrics = {
  overallHealth: { score: number; delta?: number; summary?: string };
  moodTrend: { label: string; value: number }[];
  conversationHistory: { label: string; count: number; avgMinutes: number; longestMinutes: number }[];
  topics: { name: string; sentiment: string; percent: number }[];
  conversationSummary: { headline?: string; highlights?: string[]; followUps?: string[] };
  transcript?: string | null;
  analyzedAt?: string | null;
};

const fallbackMetrics: Metrics = {
  overallHealth: fallbackHealth,
  moodTrend: fallbackMoodTrend,
  conversationHistory: fallbackConversationHistory,
  topics: fallbackTopics,
  conversationSummary: fallbackConversationSummary,
  transcript: null,
  analyzedAt: null,
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
});

export default function useLiveMetrics() {
  const [metrics, setMetrics] = useState<Metrics>(fallbackMetrics);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        // Use absolute URL to API server (bypasses Vite proxy)
        const res = await fetch('http://localhost:3001/api/patient-data');
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = (await res.json()) as Partial<Metrics>;
        console.log('✅ Loaded live data from MongoDB:', data);
        if (!cancelled) setMetrics((prev) => mergeMetrics({ ...prev, ...data }));
      } catch (err) {
        console.warn('Falling back to mock data; fetch failed', err);
      }
    };

    // Poll for updates every 10 seconds
    const poll = () => {
      if (!cancelled) {
        hydrate();
      }
    };

    hydrate();
    const interval = setInterval(poll, 10000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return useMemo(() => metrics, [metrics]);
}
