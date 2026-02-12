import { economyQuickView, rollingTotals, sessionStats, slashCommands, threadMessages } from "../lib/ux-data";

export function RuntimeThread() {
  return (
    <section className="chat-layout">
      <div className="page-stack">
        <article className="panel chat-header">
          <div>
            <p className="eyebrow">Runtime Thread</p>
            <h1>Jarvis ChatUI</h1>
          </div>
          <button className="toggle" type="button" aria-label="Jarvis armed toggle">
            Armed
          </button>
        </article>

        <article className="panel message-list">
          {threadMessages.map((message, index) => (
            <div key={`${message.meta}-${index}`} className={`message-row ${message.role}`}>
              <div className="bubble">
                <p>{message.text}</p>
                <span>{message.meta}</span>
              </div>
            </div>
          ))}
        </article>

        <article className="panel input-stack">
          <div className="chip-row">
            {slashCommands.map((command) => (
              <span key={command} className="chip">
                {command}
              </span>
            ))}
          </div>
          <div className="input-row">
            <div className="fake-input">Type a message or /command...</div>
            <button className="send" type="button" aria-label="Send message">
              Send
            </button>
          </div>
        </article>
      </div>

      <aside className="panel metrics-panel">
        <h2>Writing Metrics</h2>
        <p className="muted small">Runtime Thread · Live</p>

        <h3>Session Stats</h3>
        <div className="mini-grid">
          {sessionStats.map((stat) => (
            <article key={stat.label} className="mini-card">
              <p className="stat-value">{stat.value}</p>
              <p className="muted small">{stat.label}</p>
            </article>
          ))}
        </div>

        <h3>Rolling Totals</h3>
        <ul className="line-list">
          {rollingTotals.map((row) => (
            <li key={row.label}>
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </li>
          ))}
        </ul>

        <h3>Economy Quick View</h3>
        <ul className="line-list">
          {economyQuickView.map((row) => (
            <li key={row.label}>
              <span>{row.label}</span>
              <strong className={row.tone === "primary" ? "accent" : row.tone === "success" ? "ok" : ""}>
                {row.value}
              </strong>
            </li>
          ))}
        </ul>

        <h3>Last Prompt</h3>
        <article className="mini-card">
          <p>/capture Implement PowerUnit economy scoring model</p>
          <p className="muted small">10:42 AM · +47 PU · +28 XP</p>
        </article>
      </aside>
    </section>
  );
}
