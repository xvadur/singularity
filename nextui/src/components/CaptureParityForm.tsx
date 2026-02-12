"use client";

import { FormEvent, useState } from "react";
import { CaptureRequest, CaptureResponse } from "@/lib/contracts";
import styles from "@/app/page.module.css";

const INITIAL_CAPTURE: CaptureRequest = {
  content: "",
  source: "next-strangler",
  type: "note",
  priority: "medium",
  tags: [],
};

export function CaptureParityForm() {
  const [form, setForm] = useState<CaptureRequest>(INITIAL_CAPTURE);
  const [submitting, setSubmitting] = useState(false);
  const [response, setResponse] = useState<CaptureResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const request = {
        ...form,
        content: form.content.trim(),
      };
      const apiResponse = await fetch("/api/capture", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      });
      const payload = (await apiResponse.json()) as CaptureResponse;
      if (!apiResponse.ok || !payload.ok) {
        throw new Error(payload.error || "capture request failed");
      }
      setResponse(payload);
      setForm((current) => ({ ...current, content: "" }));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "unknown error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className={styles.captureForm} onSubmit={onSubmit}>
      <label htmlFor="capture-content">Capture payload (contract: content required)</label>
      <textarea
        id="capture-content"
        value={form.content}
        onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
        placeholder="Write capture text or /log command..."
        rows={4}
        required
      />
      <button type="submit" disabled={submitting || !form.content.trim()}>
        {submitting ? "Submitting..." : "POST /api/capture"}
      </button>
      {error ? <p className={styles.error}>Capture parity failed: {error}</p> : null}
      {response?.item?.id ? (
        <p className={styles.meta}>
          Saved item: <code>{response.item.id}</code>
          {response.queuedCommand?.id ? (
            <>
              {" "}
              | queued command: <code>{response.queuedCommand.id}</code>
            </>
          ) : null}
        </p>
      ) : null}
    </form>
  );
}

