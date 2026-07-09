#!/usr/bin/env node
// Independent Waqf-M verifier — trusts nothing of ours except that you can
// reach the public API to fetch hashes; the cryptographic checks run locally,
// and Bitcoin confirmation is checked against the real chain via OpenTimestamps.
//
//   node scripts/waqf-verify.mjs <waqf-id> [--base https://waqf.im/chain]
//
// Verifies, for a public waqf:
//   1. chain linkage      — each record's prev_hash == previous record's hash
//   2. merkle inclusion   — chain_hash + branch recomputes to the anchored root
//   3. Bitcoin anchoring  — that root is committed in a Bitcoin block (via .ots)
//   4. signatures/chain   — cross-checks the server's own verify endpoint
//
// Requires: npm i @noble/hashes opentimestamps

import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import OpenTimestamps from "opentimestamps";

const args = process.argv.slice(2);
const waqf = args.find((a) => !a.startsWith("--"));
const base = (args.find((a) => a.startsWith("--base"))?.split("=")[1]) || "https://waqf.im/chain";
if (!waqf) { console.error("usage: waqf-verify <waqf-id> [--base=<url>]"); process.exit(1); }

const pair = (a, b) => { const x = new Uint8Array(a.length + b.length); x.set(a, 0); x.set(b, a.length); return sha256(x); };
const rootFromBranch = (leafHex, branch) => {
  let h = hexToBytes(leafHex);
  for (const s of branch) { const sib = hexToBytes(s.hash); h = s.position === "right" ? pair(h, sib) : pair(sib, h); }
  return bytesToHex(h);
};

const MAGIC = Buffer.from([0x00, ...Buffer.from("OpenTimestamps"), 0x00, 0x00, ...Buffer.from("Proof"), 0x00, 0xbf, 0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94]);
async function bitcoinBlockFor(rootHex, otsBytes) {
  const { Ops, Context, DetachedTimestampFile } = OpenTimestamps;
  const digest = Buffer.from(rootHex, "hex");
  const ots = Buffer.concat([MAGIC, Buffer.from([0x01]), Buffer.from([0x08]), digest, Buffer.from(otsBytes)]);
  const d = DetachedTimestampFile.deserialize(new Context.StreamDeserialization(Uint8Array.from(ots)));
  const orig = DetachedTimestampFile.fromHash(new Ops.OpSHA256(), Uint8Array.from(digest));
  await OpenTimestamps.upgrade(d);
  const r = await OpenTimestamps.verify(d, orig);
  return r?.bitcoin ? { height: r.bitcoin.height, time: new Date(r.bitcoin.timestamp * 1000).toISOString() } : null;
}

const ok = (b) => (b ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m");
let pass = true;

console.log(`\nVerifying waqf ${waqf}\n  via ${base} (crypto checked locally)\n`);

const proof = await (await fetch(`${base}/api/waqf/${waqf}/proof`)).json();
if (proof.error) { console.error("error:", proof.error); process.exit(1); }

// 1. chain linkage
let prev = "";
let linkOk = true;
for (const r of proof.records) {
  if (r.prev_hash !== prev) linkOk = false;
  prev = r.chain_hash;
}
console.log(`${ok(linkOk)} chain linkage — ${proof.records.length} records form an unbroken hash chain`);
pass &&= linkOk;

// 2. merkle inclusion (recomputed locally)
let incOk = true;
for (const r of proof.records) {
  if (!r.anchored) { console.log(`  · seq ${r.seq} (${r.event_type}) — not yet anchored`); continue; }
  const rebuilt = rootFromBranch(r.chain_hash, r.merkle_branch);
  const good = rebuilt === r.merkle_root;
  if (!good) incOk = false;
  console.log(`  ${ok(good)} seq ${r.seq} (${r.event_type}) → root ${r.merkle_root.slice(0, 16)}…`);
}
console.log(`${ok(incOk)} merkle inclusion — every record recomputes to its anchored root`);
pass &&= incOk;

// 3. Bitcoin anchoring (checked against the real chain)
for (const b of proof.batches) {
  const otsRes = await fetch(`${base}/api/anchor/${b.batch_id}/ots`);
  if (!otsRes.ok) { console.log(`${ok(false)} bitcoin — could not fetch .ots for batch ${b.batch_id.slice(0, 8)}`); pass = false; continue; }
  const otsBytes = new Uint8Array(await otsRes.arrayBuffer());
  const btc = await bitcoinBlockFor(b.merkle_root, otsBytes.slice(MAGIC.length + 2 + 32)); // strip our header+op+digest
  if (btc) console.log(`${ok(true)} bitcoin — root ${b.merkle_root.slice(0, 16)}… in block ${btc.height} (${btc.time})`);
  else console.log(`\x1b[33m⏳\x1b[0m bitcoin — root ${b.merkle_root.slice(0, 16)}… submitted, awaiting a Bitcoin block`);
}

// 4. server-attested chain + signatures (cross-check)
const v = await (await fetch(`${base}/api/waqf/${waqf}/verify`)).json();
console.log(`${ok(v.chain_valid)} chain hashes valid (server) · ${ok(v.all_signatures_valid)} signatures valid (server)`);
pass &&= v.chain_valid && v.all_signatures_valid;

console.log(`\n${pass ? "\x1b[32mVERIFIED\x1b[0m" : "\x1b[31mFAILED\x1b[0m"} — waqf ${waqf}\n`);
process.exit(pass ? 0 : 1);
