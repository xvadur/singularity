export function CaptureHub() {
  return (
    <section className="page-stack">
      <article className="panel hero-card">
        <p className="eyebrow">Jarvis Capture Hub</p>
        <h1>Fast ingestion surface</h1>
        <p className="muted">
          This screen is intentionally light in the `.pen` baseline. Next step is wiring the live
          capture form and queue preview from existing API contracts.
        </p>
      </article>
      <article className="panel">
        <h2>Planned blocks</h2>
        <ul className="bullet-list">
          <li>Quick capture with optional slash command parser hints</li>
          <li>Queue preview for pending command jobs</li>
          <li>Last 10 captured events with compact status badges</li>
        </ul>
      </article>
    </section>
  );
}
