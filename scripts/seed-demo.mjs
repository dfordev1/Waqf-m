// Seed demo chain events + real Ed25519 signatures onto the public waqfs,
// so /explorer's "verify chain" shows a multi-link chain with verifiable
// signatures instead of a single unsigned creation record.
//
// Usage (PowerShell):
//   $env:SEED_EMAIL="you@example.com"; $env:SEED_PASSWORD="..."; node scripts/seed-demo.mjs
//
// Reads NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY from .env.local.
// Idempotent-ish: skips waqfs that already have >= 4 records, and never
// double-signs a (record, role) pair.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import * as ed from "@noble/ed25519";
import { sha256, sha512 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

ed.hashes.sha512 = sha512;

// ---- canonicalization identical to src/lib/waqfcore/crypto.ts ----
const sortDeep = (v) =>
  Array.isArray(v)
    ? v.map(sortDeep)
    : v && typeof v === "object"
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortDeep(v[k])]))
      : v;
const recordHash = (payload) =>
  bytesToHex(sha256(new TextEncoder().encode(JSON.stringify(sortDeep(payload)))));

async function makeSigner(role, name) {
  const sk = ed.utils.randomSecretKey();
  const pk = await ed.getPublicKeyAsync(sk);
  return { role, name, sk, pk: bytesToHex(pk) };
}
async function signPayload(signer, payload) {
  const sig = await ed.signAsync(hexToBytes(recordHash(payload)), signer.sk);
  return {
    signer_role: signer.role,
    signer_name: signer.name,
    public_key: signer.pk,
    signature: bytesToHex(sig),
    algorithm: "ed25519",
  };
}

// ---- env ----
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")])
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const EMAIL = process.env.SEED_EMAIL;
const PASSWORD = process.env.SEED_PASSWORD;
if (!URL_ || !KEY) throw new Error("Missing Supabase env in .env.local");
if (!EMAIL || !PASSWORD) throw new Error("Set SEED_EMAIL and SEED_PASSWORD env vars");

const db = createClient(URL_, KEY);
const { data: auth, error: authErr } = await db.auth.signInWithPassword({
  email: EMAIL,
  password: PASSWORD,
});
if (authErr) throw new Error(`Login failed: ${authErr.message}`);
console.log(`✓ signed in as ${auth.user.email}`);

const { data: waqfs, error: wErr } = await db
  .from("waqfs")
  .select("id, org_id, name, waqf_type")
  .eq("is_public", true);
if (wErr) throw new Error(wErr.message);
console.log(`found ${waqfs.length} public waqf(s): ${waqfs.map((w) => w.name).join(", ")}`);

// demo events appended per waqf (payloads are plausible, clearly-demo data)
const demoEvents = (w) => [
  {
    event_type: "deed_registered",
    payload: {
      deed: {
        title: `Waqfiyyah of ${w.name}`,
        registered_with: "Waqf-M Registry",
        note: "Deed document hash-registered in the deed vault",
      },
    },
  },
  {
    event_type: "trustee_appointed",
    payload: {
      trustee: { name: "Demo Nazir Council", term: "2026–2031", basis: "founder's shurut §3" },
    },
  },
  {
    event_type: "annual_report",
    payload: {
      report: { year: 2025, corpus_intact: true, income_distributed_pct: 92, auditor: "Demo Audit LLP" },
    },
  },
];

for (const w of waqfs) {
  const { data: recs, error: rErr } = await db
    .from("waqf_records")
    .select("id, seq, event_type, payload")
    .eq("waqf_id", w.id)
    .order("seq");
  if (rErr) { console.error(`  ! ${w.name}: ${rErr.message}`); continue; }

  // 1) append events until the chain has 4 links
  if (recs.length < 4) {
    for (const ev of demoEvents(w).slice(0, 4 - recs.length)) {
      const { error } = await db
        .from("waqf_records")
        .insert({ org_id: w.org_id, waqf_id: w.id, ...ev });
      if (error) console.error(`  ! append ${ev.event_type}: ${error.message}`);
      else console.log(`  + ${w.name}: appended ${ev.event_type}`);
    }
  } else {
    console.log(`  = ${w.name}: already has ${recs.length} records, not appending`);
  }

  // 2) sign every record that lacks signatures
  const { data: allRecs } = await db
    .from("waqf_records")
    .select("id, seq, event_type, payload")
    .eq("waqf_id", w.id)
    .order("seq");
  const { data: existingSigs } = await db
    .from("record_signatures")
    .select("record_id, signer_role")
    .in("record_id", allRecs.map((r) => r.id));
  const signed = new Set((existingSigs ?? []).map((s) => `${s.record_id}:${s.signer_role}`));

  const founder = await makeSigner("founder", "Demo Waqif");
  const witness = await makeSigner("witness", "Demo Witness");
  const trustee = await makeSigner("trustee", "Demo Nazir Council");

  for (const rec of allRecs) {
    const signers =
      rec.event_type === "creation" ? [founder, witness] : [trustee];
    for (const s of signers) {
      if (signed.has(`${rec.id}:${s.role}`)) continue;
      const sig = await signPayload(s, rec.payload);
      const { error } = await db
        .from("record_signatures")
        .insert({ record_id: rec.id, org_id: w.org_id, ...sig });
      if (error) console.error(`  ! sign seq ${rec.seq} (${s.role}): ${error.message}`);
      else console.log(`  ✎ ${w.name}: seq ${rec.seq} signed as ${s.role}`);
    }
  }
}

console.log("\nDone. Verify:");
for (const w of waqfs) {
  console.log(`  https://waqf-m.vercel.app/chain/api/waqf/${w.id}/verify`);
}
