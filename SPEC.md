# Waqf Core Protocol — Specification v0.1

*Status: Draft · July 2026 · Reference implementation: [Waqf-M](https://github.com/dfordev1/Waqf-m) (TypeScript) + `cli/waqfcore.py` (Python)*

Waqf Core is an open protocol for **verifiable waqf (Islamic endowment) registries**. It defines a record format, a hash-chain rule, a signature scheme, and a Bitcoin anchoring rule such that:

- any operator (a nazir organization, a SIRC, a national awqaf board) can run **their own** registry;
- records from any conforming registry can be **verified by anyone**, on their own machine, without trusting the operator;
- all registries can anchor into the **same neutral spine — Bitcoin** — which none of them control.

Operators operate; mathematics audits. This matches the fiqh of awqāf (an accountable nazir is required) while making silent tampering detectable by the world.

---

## 1. The record

A waqf's history is an **append-only sequence of records**. Each record has:

| Field | Type | Meaning |
|---|---|---|
| `waqf_id` | UUID | The waqf this record belongs to |
| `seq` | integer ≥ 1 | Position in the chain (1 = genesis) |
| `event_type` | enum | See §2 |
| `payload` | JSON object | Event data (schema per event type) |
| `prev_hash` | hex string | `hash` of record `seq−1`; empty string `""` for genesis |
| `recorded_at` | UTC timestamp, microseconds | Set at write time |
| `hash` | hex string | The **chain hash**, §3 |

Records are **never updated or deleted**. Corrections are new records (e.g. `amendment`).

## 2. Event types (v0.1)

`creation` · `deed_registered` · `asset_added` · `asset_disposed` · `trustee_appointed` · `trustee_removed` · `audit` · `inspection` · `court_ruling` · `restoration` · `annual_report` · `amendment` · `verification` · `lease_signed` · `lease_ended` · `case_filed` · `case_resolved` · `donation_received` · `distribution_made` · `investment_made` · `project_started` · `anchored`

A `creation` record MUST be `seq = 1` and SHOULD carry the waqf's constitutive facts (name, type — khayri/ahli/mushtarak/cash/corporate, tenure, madhab, waqif, declaration date, shurūṭ).

## 3. Chain hash (tamper-evidence)

```
hash = SHA-256_hex(
  waqf_id || "|" || seq || "|" || event_type || "|" ||
  payload_text || "|" || prev_hash || "|" ||
  to_char(recorded_at at UTC, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
)
```

- `payload_text` is the payload's canonical database text form (in the reference implementation: PostgreSQL `jsonb::text`, whose key order and spacing are deterministic).
- A chain is **valid** iff for every record: the recomputed hash matches, and `prev_hash` equals the previous record's `hash` (`""` at genesis).
- Because `waqf_id` and `seq` are inside the preimage and `(waqf_id, seq)` is unique, chain hashes are unique across a registry.

## 4. Signed hash & signatures (attestation)

Signatures cover the **payload alone**, so they are portable across implementations and survive database migration:

```
signed_hash = SHA-256( JCS(payload) )        // canonical JSON: sorted keys,
                                             // no whitespace — equivalent to
                                             // json.dumps(obj, sort_keys=True,
                                             //   separators=(",", ":"))
signature   = Ed25519.sign(signed_hash_bytes, secret_key)
```

A signature record carries: `role` ∈ {`founder`, `witness`, `trustee`, `court`, `auditor`, `regulator`} · `signer_name` · `algorithm` = `"ed25519"` · `public_key` (hex, 32 bytes) · `signature` (hex, 64 bytes) · `signed_at` (ISO-8601 UTC).

Keys are generated and held by the signers, never by the operator. Cross-implementation requirement: a signature produced by any conforming implementation MUST verify in every other (the reference TS and Python implementations are byte-for-byte compatible).

## 5. Merkle batching

Periodically, all not-yet-batched records are committed under one root:

- **Leaves:** the records' chain hashes (32-byte raw), ordered by `(recorded_at, record_id)`.
- **Tree:** pairwise `SHA-256(left ‖ right)`; if a level has odd length, duplicate its last node; root is the top node, published as hex.
- **Inclusion proof:** for any record, the sibling path (hash + left/right position per level). Verifiers recompute leaf→root locally.

## 6. Bitcoin anchoring (OpenTimestamps)

The Merkle root (a 32-byte SHA-256 digest) is submitted to independent [OpenTimestamps](https://opentimestamps.org) calendar servers (`POST <calendar>/digest`, raw bytes). The calendar responses are stored verbatim. A detached `.ots` proof file is:

```
MAGIC ("\x00OpenTimestamps\x00\x00Proof\x00\xbf\x89\xe2\xe8\x84\xe8\x92\x94")
|| 0x01 (version) || 0x08 (OpSHA256 tag) || root (32 bytes) || calendar response
```

Calendars aggregate digests into a Bitcoin transaction; within hours the proof upgrades to a **Bitcoin block attestation**, verifiable with the official OTS tooling against the Bitcoin blockchain. From that moment the batch — and via inclusion proofs, every record in it — is timestamped in world history, outside any operator's control.

## 7. Verification tiers

Anyone can verify, with increasing independence:

1. **Chain** — recompute every hash & link (server-assisted or local).
2. **Signatures** — verify each Ed25519 signature against the payload's `signed_hash` (local).
3. **Merkle inclusion** — recompute leaf→root from the branch (local).
4. **Bitcoin** — verify the `.ots` proof against Bitcoin (local, via OTS).

Reference verifier: `npx waqf-verify <waqf-id>` (or `packages/waqf-verify` from source) — runs 1–4 trusting only mathematics and Bitcoin.

## 8. Privacy tiers

- **Public waqfs:** event metadata + hashes are public; anyone may verify.
- **Private waqfs:** only hashes ever leave the operator (`waqf_records_public`-style views expose no payloads); verification of private records is possible by parties the operator authorizes, and Bitcoin anchoring still publicly commits their existence and timing without revealing content. Hashes reveal nothing about payloads.

## 9. Conformance

An implementation conforms to Waqf Core v0.1 if: records are append-only; chain hashes follow §3; signatures follow §4 and verify across implementations; batching follows §5; anchoring follows §6; and a public verifier can complete tiers 1–4. Multiple conforming registries — run by different institutions on their own infrastructure — form a **federation** whose shared trust anchor is Bitcoin.

---

*This specification is open. Implement it, break it, improve it: [github.com/dfordev1/Waqf-m](https://github.com/dfordev1/Waqf-m) · live reference registry: [waqf.im/chain](https://waqf.im/chain/explorer)*
