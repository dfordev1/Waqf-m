# Waqf‑M

An end-to-end waqf (Islamic endowment) management platform, built around
**Waqf Core** — an open, verifiable protocol for waqf records. Every waqf
registered here gets a Git-style hash-chained event history, real Ed25519
signatures, and Merkle-batched Bitcoin anchoring via OpenTimestamps.

See [docs/BLUEPRINT.md](docs/BLUEPRINT.md) for the full product strategy and
module roadmap.

## Stack

- **App**: Next.js (App Router) + TypeScript + Tailwind
- **Backend**: Supabase (Postgres + PostGIS + Auth + Row Level Security + Storage)
- **Protocol crypto**: `@noble/ed25519` / `@noble/hashes` (TypeScript), cross-verified
  byte-for-byte against an independent Python implementation (`cli/waqfcore.py`)
- **Maps**: Leaflet / react-leaflet, parcel boundaries stored as PostGIS geography
- **Anchoring**: OpenTimestamps public calendar servers (real Bitcoin-anchor path)

## What's implemented

- **Registry**: multi-tenant orgs, roles, waqfs (khayri/ahli/mushtarak/cash/corporate),
  madhab, perpetual vs. temporary tenure, founder's conditions (`shurut`) as structured data
- **Waqf Core protocol**: hash-chained append-only `waqf_records` (13 event types),
  Ed25519 signatures (founder/witness/trustee/court/auditor/regulator),
  Merkle batch anchoring, public proof-tier APIs
- **Assets**: PostGIS parcel boundaries drawn on a map, valuation history,
  status (active/leased/idle/encroached/under_litigation/substituted)
- **Leases**: contracts, rent, market-rent benchmarking (under-renting detection)
- **Litigation**: cases, hearings, limitation deadlines; encroachment cases
  auto-flag the linked asset
- **FAS 37 fund accounting**: corpus vs. income fund separation, double-entry
  journal with a balanced-entry constraint
- **Cash waqf**: campaigns, donations
- **Beneficiaries & distributions**: shares, generational succession, append-only payments
- **Investments**: Shariah-screening guard (a database constraint blocks
  unscreened activation), development pipeline for idle land
- **Deed vault**: uploads to private Storage, SHA-256 registered, public
  document-integrity check
- **Public explorer**: `/explorer` — browse public waqfs, verify chains, anchor batches

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project URL + anon key
npx supabase db push          # apply migrations (needs your DB password)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Key API routes

- `GET /api/waqf/[id]/history` — public event history (hashes only)
- `GET /api/waqf/[id]/verify` — re-verifies the full hash chain + all signatures
- `POST /api/waqf/[id]/sign` — sign a chained record with an Ed25519 key
- `POST /api/waqf/[id]/deeds` — upload + hash-register a deed document
- `POST /api/verify-document` — check a document's SHA-256 against registered deeds
- `POST /api/anchor` — Merkle-batch all unbatched records
- `POST /api/anchor/[id]/submit` — anchor a batch to OpenTimestamps calendars

## Deploying

```bash
npx vercel login   # one-time, your own account
npx vercel          # deploys; add the two env vars from .env.local in the dashboard
```
