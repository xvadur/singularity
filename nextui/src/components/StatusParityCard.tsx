"use client";

import { useEffect, useState } from "react";
import { StatusResponse } from "@/lib/contracts";
import styles from "@/app/page.module.css";

export function StatusParityCard() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/status", { cache: "no-store" });
        const payload = (await response.json()) as StatusResponse;

        if (!response.ok) {
          throw new Error((payload as { error?: string }).error || "status request failed");
        }
        if (!cancelled) {
          setStatus(payload);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "unknown error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className={styles.meta}>Loading /api/status...</p>;
  }

  if (error) {
    return <p className={styles.error}>Status parity failed: {error}</p>;
  }

  if (!status) {
    return <p className={styles.error}>Status parity failed: empty response.</p>;
  }

  return (
    <div className={styles.cardGrid}>
      <div className={styles.metric}>
        <span>Timestamp</span>
        <strong>{status.timestamp}</strong>
      </div>
      <div className={styles.metric}>
        <span>Player</span>
        <strong>
          {status.player.name} · L{status.player.level}
        </strong>
      </div>
      <div className={styles.metric}>
        <span>Inbox Pending</span>
        <strong>{status.overview?.inboxPending ?? status.inbox?.pending ?? "n/a"}</strong>
      </div>
      <div className={styles.metric}>
        <span>Commands Pending</span>
        <strong>{status.overview?.pendingCommands ?? status.commands?.pending ?? "n/a"}</strong>
      </div>
    </div>
  );
}

