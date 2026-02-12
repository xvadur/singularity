import { activityFeed, commandCenterStats, systemsFeed } from "../lib/ux-data";

function toneClass(tone?: string) {
  if (!tone) return "";
  return `tone-${tone}`;
}

export function CommandCenter() {
  return (
    <section className="page-stack">
      <article className="panel hero-card">
        <p className="eyebrow">Jarvis Command Center</p>
        <h1>Runtime-first control surface</h1>
        <p className="muted">
          Capture, queue, PowerUnit economy, and daily execution in one operational layer.
        </p>
      </article>

      <section className="stat-grid four">
        {commandCenterStats.map((stat) => (
          <article key={stat.label} className={`panel stat-card ${toneClass(stat.tone)}`}>
            <p className="muted small">{stat.label}</p>
            <p className="stat-value">{stat.value}</p>
            <p className="muted small">{stat.note}</p>
          </article>
        ))}
      </section>

      <section className="split-grid">
        <article className="panel">
          <h2>Main Quest</h2>
          <p className="muted">Build Pencil-driven UX runtime in Next migration sandbox.</p>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: "72%" }} />
          </div>
          <p className="muted small">72% progress · target today: parity for all route handlers</p>
        </article>

        <article className="panel">
          <h2>Capture Focus</h2>
          <ul className="bullet-list">
            <li>/capture for fast task ingestion</li>
            <li>/queue for command backlog health</li>
            <li>/brief for session renaming</li>
          </ul>
        </article>
      </section>

      <section className="split-grid">
        <article className="panel">
          <h2>Recent Activity</h2>
          <ul className="bullet-list">
            {activityFeed.map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <h2>Systems</h2>
          <ul className="status-list">
            {systemsFeed.map((system) => (
              <li key={system.name}>
                <span>{system.name}</span>
                <strong>{system.status}</strong>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </section>
  );
}
