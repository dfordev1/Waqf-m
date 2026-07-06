"use client";

import { useState } from "react";

export function CreateBatchButton() {
  const [msg, setMsg] = useState<string | null>(null);
  async function run() {
    setMsg("Batching unbatched records…");
    const r = await fetch("/api/anchor", { method: "POST" });
    const j = await r.json();
    setMsg(r.ok ? JSON.stringify(j) : `Error: ${j.error}`);
    if (r.ok) setTimeout(() => location.reload(), 800);
  }
  return (
    <div className="space-y-1">
      <button
        onClick={run}
        className="rounded border border-neutral-300 px-3 py-1.5 text-xs hover:bg-neutral-100"
      >
        Create batch from unbatched records
      </button>
      {msg && <p className="text-xs text-neutral-500">{msg}</p>}
    </div>
  );
}

export function SubmitAnchorButton({ batchId }: { batchId: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    setMsg("Submitting to OpenTimestamps calendars…");
    const r = await fetch(`/api/anchor/${batchId}/submit`, { method: "POST" });
    const j = await r.json();
    setBusy(false);
    setMsg(
      r.ok
        ? `Anchored: ${j.calendars_accepted}/${j.calendars_total} calendars accepted.`
        : `Error: ${j.error}`
    );
    if (r.ok) setTimeout(() => location.reload(), 1200);
  }
  return (
    <span className="ml-2">
      <button
        onClick={run}
        disabled={busy}
        className="rounded bg-emerald-700 px-2 py-0.5 text-xs text-white hover:bg-emerald-600 disabled:opacity-40"
      >
        Anchor to Bitcoin (OpenTimestamps)
      </button>
      {msg && <span className="ml-2 text-xs text-neutral-500">{msg}</span>}
    </span>
  );
}
