import { CSSProperties } from 'react';
import MiniBarChart from './components/MiniBarChart';
import TrendSparkline from './components/TrendSparkline';
import {
  conversationHistory,
  conversationSummary,
  moodTrend,
  overallHealth,
  patientProfile,
  topics,
} from './data/patient';
import './index.css';

function App() {
  const moodPoints = moodTrend.map((item) => item.value);
  const moodChange = moodPoints[moodPoints.length - 1] - moodPoints[0];

  const weeklyConversationCount = conversationHistory.reduce((total, day) => total + day.count, 0);
  const totalMinutes = conversationHistory.reduce((total, day) => total + day.count * day.avgMinutes, 0);
  const avgConversationLength = Math.round(totalMinutes / weeklyConversationCount);
  const longestConversation = Math.max(...conversationHistory.map((day) => day.longestMinutes));

  const ringStyle = {
    '--score': overallHealth.score,
  } as CSSProperties;

  return (
    <div className="app-shell">
      <header className="nav">
        <div className="brand">
          <div className="brand-mark">A</div>
          <span>AdaHealth · Patient Dashboard</span>
        </div>
        <div className="patient-chip">
          <div className="avatar">MP</div>
          <div>
            <div>{patientProfile.name}</div>
            <div className="subtle">
              {patientProfile.age} · {patientProfile.location}
            </div>
          </div>
        </div>
      </header>

      <section className="hero-grid">
        <div className="card health-card">
          <div className="score-ring" style={ringStyle}>
            <span>{overallHealth.score}</span>
          </div>
          <div className="stack">
            <div className="card-header">
              <div>
                <div className="section-title">Overall health score</div>
                <h3>Semantic wellness</h3>
              </div>
              <span className="pill change">+{overallHealth.delta} pts</span>
            </div>
            <p className="summary">{overallHealth.summary}</p>
            <div className="kpis">
              <div className="kpi">
                <small>Last voice check-in</small>
                <strong>{patientProfile.lastCheckIn}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="card touchpoints-card">
          <div className="card-header">
            <div>
              <div className="section-title">Voice presence</div>
              <h3>Today&apos;s touch points</h3>
            </div>
            <span className="badge">{weeklyConversationCount} calls this week</span>
          </div>
          <div className="touchpoints-body">
            <div className="touchpoints-info">
              <p className="summary">{conversationSummary.headline}</p>
              <ul className="bullet-list">
                {conversationSummary.highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="footer-actions">
                <button className="ghost-button" type="button">
                  Review transcript
                </button>
              </div>
            </div>
            <div className="touchpoints-metrics">
              <div className="kpi">
                <small>Mood shift (7d)</small>
                <strong className={moodChange >= 0 ? 'change' : 'change down'}>
                  {moodChange >= 0 ? '+' : ''}
                  {moodChange} pts
                </strong>
              </div>
              <div className="kpi">
                <small>Avg length</small>
                <strong>{avgConversationLength} min</strong>
              </div>
              <div className="kpi">
                <small>Longest</small>
                <strong>{longestConversation} min</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid">
        <div className="card stack">
          <div className="card-header">
            <div>
              <div className="section-title">Mood score</div>
              <h3>Calm & uplifted</h3>
            </div>
            <span className={moodChange >= 0 ? 'pill change' : 'pill change down'}>
              {moodChange >= 0 ? '+' : ''}
              {moodChange} pts
            </span>
          </div>
          <TrendSparkline points={moodPoints} stroke="#2563eb" fill="rgba(37, 99, 235, 0.1)" />
          <div className="small-grid">
            <div className="kpi">
              <small>Current mood score</small>
              <strong>{moodPoints[moodPoints.length - 1]} / 100</strong>
            </div>
            <div className="kpi">
              <small>7d trajectory</small>
              <strong>Upward, low volatility</strong>
            </div>
          </div>
        </div>

        <div className="card stack">
          <div className="card-header">
            <div>
              <div className="section-title">Conversations</div>
              <h3>Past 7 days</h3>
            </div>
            <span className="pill">{weeklyConversationCount} total</span>
          </div>
          <MiniBarChart
            data={conversationHistory.map((day) => ({
              label: day.label,
              value: day.avgMinutes,
              hint: `${day.count} calls · ${day.avgMinutes}m avg`,
            }))}
            maxValue={Math.max(...conversationHistory.map((day) => day.longestMinutes))}
          />
          <div className="small-grid">
            <div className="kpi">
              <small>Longest call</small>
              <strong>{longestConversation} min</strong>
            </div>
            <div className="kpi">
              <small>Daily average</small>
              <strong>{avgConversationLength} min</strong>
            </div>
            <div className="kpi">
              <small>Check-in cadence</small>
              <strong>Every ~11 hrs</strong>
            </div>
          </div>
        </div>

        <div className="card stack">
          <div className="card-header">
            <div>
              <div className="section-title">Topics</div>
              <h3>What Ada heard</h3>
            </div>
            <span className="badge">voice + transcript</span>
          </div>
          <div className="stack">
            {topics.map((topic) => (
              <div key={topic.name} className="topic-row">
                <div>
                  <div>{topic.name}</div>
                  <div className="topic-bar">
                    <div className="topic-fill" style={{ width: `${topic.percent}%` }} />
                  </div>
                </div>
                <span className="tag" data-tone={topic.sentiment}>
                  {topic.sentiment}
                  <span className="badge">{topic.percent}%</span>
                </span>
              </div>
            ))}
          </div>
          <div className="chips">
            <span className="pill">Positive language ↑</span>
            <span className="pill">Energy steady</span>
            <span className="pill">Hydration streak</span>
          </div>
        </div>


      </section>
    </div>
  );
}

export default App;
