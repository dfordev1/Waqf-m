"use client";

import { useState } from "react";

export default function DeedUpload({ waqfId, orgId }: { waqfId: string; orgId: string }) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload() {
    if (!file || !title) return;
    setBusy(true);
    setMsg("Uploading & hashing…");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("org_id", orgId);
    fd.append("title", title);
    const r = await fetch(`/api/waqf/${waqfId}/deeds`, { method: "POST", body: fd });
    const j = await r.json();
    setBusy(false);
    setMsg(r.ok ? `Registered. SHA-256: ${j.sha256.slice(0, 24)}…` : `Error: ${j.error}`);
    if (r.ok) {
      setTitle("");
      setFile(null);
      setTimeout(() => location.reload(), 900);
    }
  }

  return (
    <details className="rounded border border-neutral-200">
      <summary className="cursor-pointer p-2 text-sm font-medium hover:bg-neutral-50">
        📜 Upload deed
      </summary>
      <div className="grid grid-cols-2 gap-2 p-3 md:grid-cols-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Deed title"
          className="rounded border border-neutral-300 p-2 text-sm"
        />
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="col-span-2 rounded border border-neutral-300 p-2 text-sm"
        />
        <button
          type="button"
          onClick={upload}
          disabled={busy || !file || !title}
          className="col-span-full rounded bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-40"
        >
          Upload & register hash
        </button>
        {msg && <p className="col-span-full text-xs text-neutral-500">{msg}</p>}
      </div>
    </details>
  );
}
