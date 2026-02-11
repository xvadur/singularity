import { useCallback, useEffect, useMemo, useState } from 'react';

type InboxItem = {
  id: string;
  type: string;
  content: string;
  capturedAt?: string;
  priority?: string;
  tags?: string[];
};

type EventItem = {
  id?: string | null;
  ts?: string | null;
  domain?: string | null;
  type?: string | null;
  source?: string | null;
  text?: string | null;
};

type StatusResponse = {
  timestamp?: string;
  overview?: {
    vitalityScore?: number | null;
    vitalityBand?: string | null;
    totalXP?: number;
    streakDays?: number;
    openTasks?: number;
    inboxPending?: number | null;
  };
  inbox?: {
    pending?: number | null;
    totalCaptured?: number | null;
    list?: InboxItem[];
  };
  events?: {
    date?: string;
    recent?: EventItem[];
    count?: number;
  };
  systems?: Record<string, boolean>;
};

type CaptureType = 'task' | 'idea' | 'insight' | 'link' | 'note';
type CapturePriority = 'low' | 'medium' | 'high' | 'critical';

function fmt(ts?: string | null) {
  if (!ts) return 'N/A';
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

function clsForPriority(priority?: string) {
  switch ((priority || '').toLowerCase()) {
    case 'critical':
      return 'priority priority-critical';
    case 'high':
      return 'priority priority-high';
    case 'medium':
      return 'priority priority-medium';
    case 'low':
      return 'priority priority-low';
    default:
      return 'priority';
  }
}

export default function App() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [type, setType] = useState<CaptureType>('note');
  const [priority, setPriority] = useState<CapturePriority>('medium');
  const [tags, setTags] = useState('');
  const [content, setContent] = useState('');
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('alfred_capture_token') || '';
    } catch {
      return '';
    }
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/status');
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = (await res.json()) as StatusResponse;
      setStatus(data);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30_000);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    try {
      localStorage.setItem('alfred_capture_token', token);
    } catch {
      // ignore
    }
  }, [token]);

  const parsedTags = useMemo(() => {
    return tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
      .slice(0, 12);
  }, [tags]);

  const submit = useCallback(async () => {
    const text = content.trim();
    if (!text) return;

    setErr(null);
    try {
      const headers: Record<string, string> = { 'content-type': 'application/json' };
      if (token.trim()) headers.authorization = `Bearer ${token.trim()}`;

      const res = await fetch('/api/capture', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type,
          priority,
          tags: parsedTags,
          content: text
        })
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        throw new Error(msg || `capture ${res.status}`);
      }

      setContent('');
      await refresh();
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }, [content, parsedTags, priority, refresh, token, type]);

  return (
    <div className="page">
      <header className="header">
        <div className="title">
          <div className="h1">Alfred Console</div>
          <div className="sub">
            <a href="/" className="link">
              Dashboard
            </a>
            <span className="muted"> / </span>
            <button className="link-btn" onClick={refresh} disabled={loading}>
              Refresh
            </button>
          </div>
        </div>
        <div className="pills">
          <div className="pill">
            XP <span className="mono">{status?.overview?.totalXP ?? '…'}</span>
          </div>
          <div className="pill">
            Streak <span className="mono">{status?.overview?.streakDays ?? '…'}</span>
          </div>
          <div className="pill">
            Inbox <span className="mono">{status?.overview?.inboxPending ?? status?.inbox?.pending ?? '…'}</span>
          </div>
          <div className="pill">
            Vitality{' '}
            <span className="mono">
              {status?.overview?.vitalityScore ?? '…'}
              {status?.overview?.vitalityBand ? ` (${status.overview.vitalityBand})` : ''}
            </span>
          </div>
        </div>
      </header>

      {err ? <div className="error">Error: {err}</div> : null}

      <main className="grid">
        <section className="card span-6">
          <div className="card-title">Capture</div>
          <div className="card-sub">Drop a task/idea/command into Jarvis inbox.</div>

          <div className="form-row">
            <label className="label">
              Type
              <select className="select" value={type} onChange={e => setType(e.target.value as CaptureType)}>
                <option value="note">note</option>
                <option value="task">task</option>
                <option value="idea">idea</option>
                <option value="insight">insight</option>
                <option value="link">link</option>
              </select>
            </label>

            <label className="label">
              Priority
              <select
                className="select"
                value={priority}
                onChange={e => setPriority(e.target.value as CapturePriority)}
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
                <option value="critical">critical</option>
              </select>
            </label>

            <label className="label">
              Tags (comma)
              <input className="input" value={tags} onChange={e => setTags(e.target.value)} placeholder="bni, sales" />
            </label>
          </div>

          <label className="label">
            Token (optional)
            <input
              className="input"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="CAPTURE_TOKEN (if enabled on server)"
              autoComplete="off"
            />
          </label>

          <label className="label">
            Content
            <textarea
              className="textarea"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Write what you want Alfred/Jarvis to capture..."
              rows={5}
            />
          </label>

          <div className="actions">
            <button className="btn" onClick={submit} disabled={!content.trim()}>
              Send to Inbox
            </button>
            <div className="muted tiny">
              Last update: <span className="mono">{fmt(status?.timestamp || null)}</span>
            </div>
          </div>
        </section>

        <section className="card span-6">
          <div className="card-title">Inbox (pending)</div>
          <div className="card-sub">
            {status?.inbox?.pending ?? '…'} pending, {status?.inbox?.totalCaptured ?? '…'} total captured
          </div>
          <div className="list">
            {(status?.inbox?.list || []).map(item => (
              <div key={item.id} className={`item ${clsForPriority(item.priority)}`}>
                <div className="item-top">
                  <div className="mono">{item.type}</div>
                  <div className="muted tiny">{fmt(item.capturedAt || null)}</div>
                </div>
                <div className="item-content">{item.content}</div>
                {item.tags?.length ? <div className="tags">{item.tags.map(t => `#${t}`).join(' ')}</div> : null}
              </div>
            ))}
            {status?.inbox?.list?.length === 0 ? <div className="muted tiny">No pending items.</div> : null}
          </div>
        </section>

        <section className="card span-12">
          <div className="card-title">Recent Events</div>
          <div className="card-sub">
            {status?.events?.date ?? '…'} ({status?.events?.count ?? '…'})
          </div>
          <div className="list events">
            {(status?.events?.recent || []).slice().reverse().map((e, idx) => (
              <div key={`${e.ts ?? 'ts'}-${idx}`} className="event">
                <div className="event-meta">
                  <span className="mono">{fmt(e.ts || null)}</span>
                  <span className="badge">{e.domain || 'event'}</span>
                  {e.type ? <span className="badge">{e.type}</span> : null}
                  {e.source ? <span className="badge muted">{e.source}</span> : null}
                </div>
                <div className="event-text">{e.text || '(no text)'}</div>
              </div>
            ))}
            {status?.events?.recent?.length === 0 ? <div className="muted tiny">No events.</div> : null}
          </div>
        </section>
      </main>
    </div>
  );
}
