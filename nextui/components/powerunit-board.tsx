import { puStats, taskRows } from "../lib/ux-data";

function toneClass(tone?: string) {
  if (!tone) return "";
  return `tone-${tone}`;
}

export function PowerUnitBoard() {
  return (
    <section className="page-stack">
      <article className="panel board-head">
        <div>
          <h1>Task Management</h1>
          <p className="muted">PowerUnit Economy Board · Utorok 12.2</p>
        </div>
        <button type="button" className="action-btn">
          New Task
        </button>
      </article>

      <section className="stat-grid four">
        {puStats.map((stat) => (
          <article key={stat.label} className={`panel stat-card ${toneClass(stat.tone)}`}>
            <p className="muted small">{stat.label}</p>
            <p className="stat-value">{stat.value}</p>
            {stat.label === "Daily PU Budget" ? (
              <div className="progress-track compact">
                <div className="progress-fill" style={{ width: "34%" }} />
              </div>
            ) : null}
            <p className="muted small">{stat.note}</p>
          </article>
        ))}
      </section>

      <article className="panel table-shell">
        <div className="table-head">
          <h2>Task Board</h2>
          <span className="chip">Filter: active</span>
        </div>

        <div className="chip-row">
          <span className="chip active">All</span>
          <span className="chip">Habits</span>
          <span className="chip">Dailies</span>
          <span className="chip">Todos</span>
          <span className="chip">Rewards</span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Type</th>
                <th>Priority</th>
                <th>Progress</th>
                <th>Planned PU</th>
                <th>Earned PU</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {taskRows.map((row) => (
                <tr key={row.task}>
                  <td>{row.task}</td>
                  <td>{row.type}</td>
                  <td>{row.priority}</td>
                  <td>
                    <div className="progress-track compact">
                      <div className="progress-fill" style={{ width: `${row.progress}%` }} />
                    </div>
                  </td>
                  <td className="accent">{row.planned}</td>
                  <td>{row.earned}</td>
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
