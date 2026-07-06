"use client";

import { useState } from "react";

const ROLES = ["founder", "witness", "trustee", "court", "auditor", "regulator"];

export default function SignPanel({ waqfId }: { waqfId: string }) {
  const [sk, setSk] = useState("");
  const [pk, setPk] = useState("");
  const [seq, setSeq] = useState("1");
  const [role, setRole] = useState("trustee");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function genKey() {
    const r = await fetch("/api/keygen");
    const j = await r.json();
    setSk(j.private_key);
    setPk(j.public_key);
    setMsg("New keypair generated. Save the private key yourself — it is never stored.");
  }

  async function sign() {
    setMsg("Signing…");
    const r = await fetch(`/api/waqf/${waqfId}/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seq: Number(seq), sk, role, signer_name: name }),
    });
    const j = await r.json();
    setMsg(r.ok ? `Signed record #${seq} as ${role}.` : `Error: ${j.error}`);
    if (r.ok) setTimeout(() => location.reload(), 700);
  }

  return (
    <details className="rounded border border-neutral-200">
      <summary className="cursor-pointer p-2 text-sm font-medium hover:bg-neutral-50">
        🔏 Sign a record (Ed25519)
      </summary>
      <div className="grid grid-cols-2 gap-2 p-3 md:grid-cols-3">
        <button
          type="button"
          onClick={genKey}
          className="col-span-full rounded border border-neutral-300 p-2 text-sm hover:bg-neutral-100"
        >
          Generate new keypair
        </button>
        <input
          value={sk}
          onChange={(e) => setSk(e.target.value)}
          placeholder="Private key (hex)"
          className="col-span-full rounded border border-neutral-300 p-2 font-mono text-xs"
        />
        {pk && (
          <p className="col-span-full break-all font-mono text-xs text-neutral-400">
            public key: {pk}
          </p>
        )}
        <input
          value={seq}
          onChange={(e) => setSeq(e.target.value)}
          type="number"
          placeholder="Record #"
          className="rounded border border-neutral-300 p-2 text-sm"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded border border-neutral-300 p-2 text-sm"
        >
          {ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Signer name"
          className="rounded border border-neutral-300 p-2 text-sm"
        />
        <button
          type="button"
          onClick={sign}
          disabled={!sk}
          className="col-span-full rounded bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-40"
        >
          Sign record
        </button>
        {msg && <p className="col-span-full text-xs text-neutral-500">{msg}</p>}
      </div>
    </details>
  );
}
