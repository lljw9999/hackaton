export const patientProfile = {
  name: 'Marian Powell',
  age: 82,
  location: 'Seattle, WA',
  lastCheckIn: 'Today · 8:45 AM'
};

export const overallHealth = {
  score: 87,
  delta: 4,
  summary: 'Stable overall. Better hydration and steadier sleep reported over the last 3 days.'
};

export const moodTrend = [
  { label: 'Mon', value: 64 },
  { label: 'Tue', value: 68 },
  { label: 'Wed', value: 71 },
  { label: 'Thu', value: 73 },
  { label: 'Fri', value: 75 },
  { label: 'Sat', value: 72 },
  { label: 'Sun', value: 78 }
];

export const conversationHistory = [
  { label: 'Mon', count: 3, avgMinutes: 12, longestMinutes: 17 },
  { label: 'Tue', count: 2, avgMinutes: 9, longestMinutes: 14 },
  { label: 'Wed', count: 4, avgMinutes: 15, longestMinutes: 19 },
  { label: 'Thu', count: 3, avgMinutes: 11, longestMinutes: 16 },
  { label: 'Fri', count: 2, avgMinutes: 10, longestMinutes: 15 },
  { label: 'Sat', count: 2, avgMinutes: 8, longestMinutes: 12 },
  { label: 'Sun', count: 2, avgMinutes: 14, longestMinutes: 18 }
];

export const topics = [
  { name: 'Sleep quality', sentiment: 'positive', percent: 28 },
  { name: 'Medication routine', sentiment: 'steady', percent: 24 },
  { name: 'Nutrition & hydration', sentiment: 'positive', percent: 18 },
  { name: 'Mobility & balance', sentiment: 'cautious', percent: 15 },
  { name: 'Family updates', sentiment: 'positive', percent: 15 }
];

export const conversationSummary = {
  headline: 'Ada noted a calmer tone and brighter affect. Sleep improved after adjusting evening tea intake.',
  highlights: [
    'Reports waking up once per night instead of three times earlier in the week.',
    'Hydration reminders accepted in 6 of the last 7 check-ins.',
    'Mood language shifted toward optimistic words (“excited”, “relieved”).',
    'Mild balance concern when standing quickly; no pain reported.'
  ],
  followUps: [
    'Confirm morning medication adherence remains above 90% this week.',
    'Prompt brief seated stretches after breakfast to address balance.',
    'Share hydration streak celebration during next call.'
  ]
};
