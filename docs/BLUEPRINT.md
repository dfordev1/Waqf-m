# Waqf-M — Master Blueprint
### The world's best waqf management platform

**Thesis:** Every existing system covers one slice — WAMSI/UMEED is a registry, FEKRA is a back office, BWI/myWakaf are donation gateways, VBYS is compliance filing. **No system on earth does the full lifecycle: registration → asset → lease → accounting → distribution → beneficiary impact.** Waqf-M does, built natively on AAOIFI standards (FAS 37 accounting, GS 13 governance), with radical transparency — because trust deficit is the domain's #1 failure mode.

---

## 1. Core design principle: the Trust Engine

The heart of the platform is a **rules-driven trust engine**:

- **Immutable corpus** — waqf assets can never be sold/gifted/inherited; the only exit is istibdal (substitution), enforced by workflow.
- **Shurut al-waqif (founder's conditions) as code** — stored as structured, machine-enforceable constraints on distribution, investment, mutawalli succession, and istibdal ("shart al-waqif ka-nass al-shari").
- **Madhab & jurisdiction rule packs** — pluggable rules: Hanafi/Maliki/Shafi'i/Hanbali istibdal strictness, temporary-waqf permissibility, India Waqf Act 2025 / Malaysia SIRC / Indonesia BWI / Gulf compliance profiles.
- **Immutable audit trail** — append-only event log for every mutation; optional blockchain anchoring.

## 2. Domain model (entities)

| Entity | Notes |
|---|---|
| **Waqf** | Type taxonomy: khayri (charitable), ahli/dhurri (family — genealogy/succession engine), mushtarak (mixed with split ratios), cash, corporate (shares), temporary vs perpetual (expiry → revert logic) |
| **Waqif** | Identity, capacity checks, structured shurut (conditions) |
| **Mutawalli/Nazir** | Individual or board (GS 13 prefers board), licensing, remuneration cap (e.g. Indonesia 10% of net), performance KPIs, removal workflow |
| **Asset (mawquf)** | Land/building/movable/cash/shares/IP; geo-boundaries, title docs, valuation history, occupancy state |
| **Beneficiary** | Classes, shares, generational succession, fallback-to-the-poor rule |
| **Deed (waqfiyya)** | Digitized, OCR'd, versioned document of record |
| **Lease / Tenant** | Contracts, rent schedule, arrears, market-rate benchmark |
| **Case (litigation/encroachment)** | Full legal lifecycle, hearing dates, limitation-period alerts |
| **Regulator/Qadi** | Approval workflows (istibdal, leases, registration) |

## 3. Feature modules

### M1 — Registry & Deeds
Waqf/deed registration, digital waqfiyya archive with OCR (Arabic/Urdu/Persian scripts), deed-chain provenance, public searchable registry, regulator portal-ready exports (UMEED/SIWAK formats), compliance deadline alerts.

### M2 — Asset & GIS
Property registry with classification and valuation history; **GIS parcel mapping with satellite-image change detection for encroachment alerts** (only WAMSI even attempts this); cadastral overlay; encroachment-to-case pipeline into M5.

### M3 — Leases & Yield Optimization
Lease contracts, tenant self-service portal with digital rent payment (manual everywhere today), arrears automation, **market-rent benchmarking / AVM** to end systemic under-renting, lease-expiry alerts, tender/auction workflows, per-asset yield dashboards.

### M4 — Shariah Fund Accounting (AAOIFI FAS 37 native — exists nowhere today)
Corpus vs income (usufruct) fund separation; istibdal transaction accounting with ring-fenced proceeds; non-compliant income purification tracking; GL, budgets, FAS 37 statements (financial position, activities, cash flows); waqif-condition-driven revenue distribution.

### M5 — Litigation & Encroachment
Case lifecycle (only WAMSI has even a register): documents, counsel, hearings, limitation deadlines, linkage to GIS alerts and assets.

### M6 — Governance & Compliance (GS 13)
Mutawalli licensing/certification, board-of-nazirs structures, audit committee workflows, annual statutory returns filing, **public governance scoring and yield benchmarking per mutawalli**, complaints/whistleblower channel.

### M7 — Cash Waqf & Donor Experience
Payment gateways (cards, FPX, QRIS, wallets), recurring/micro/round-up/salary-deduction waqf, waqf certificates, project-based campaigns — and the killer gap: a **perpetual "waqf statement"** showing each donor their endowment's corpus, yield, and disbursements forever. No platform does this.

### M8 — Distribution & Beneficiaries
Condition-based disbursement engine, beneficiary registries with generational succession (family waqf), scholarship/social-aid program administration, beneficiary loans, impact reporting.

### M9 — Investment & Development
Cash-waqf investment with Shariah screening, waqf sukuk / CWLS subscription tracking (coupon-to-beneficiary flows), **idle-land development pipeline** (feasibility → financing → construction tracking) — universally cited problem, zero tooling anywhere.

### M10 — Transparency & Public Portal
Open registry, per-waqf performance dashboards, open data APIs, optional blockchain anchoring of the audit log.

## 4. Differentiators (the 11 gaps no one covers)
1. End-to-end lifecycle in one system
2. AAOIFI-native corpus-perpetuity accounting
3. Donor-to-yield transparency (perpetual waqf statement)
4. GIS-linked encroachment → litigation workflow
5. Idle-asset development pipeline
6. Public mutawalli performance analytics
7. Interoperable data standard (export to UMEED, SIWAK, etc.)
8. Tenant self-service + digital rent
9. Market-rent intelligence / AVM
10. Multi-madhab, multi-jurisdiction rule packs
11. Verified open GIS + independently auditable records

## 5. Architecture & stack (recommended)

- **Web app:** Next.js (App Router) + TypeScript + Tailwind — admin console, public portal, tenant & donor self-service; RTL + i18n (Arabic, Urdu, English, Bahasa, Turkish) from day one.
- **API/domain layer:** TypeScript modular monolith (NestJS-style modules or Next server actions early on), event-sourced audit log for the trust engine.
- **DB:** PostgreSQL + **PostGIS** (geospatial is first-class) via Prisma; append-only `events` table.
- **Payments:** adapter layer (Stripe first; FPX/QRIS/Razorpay adapters later).
- **Docs/OCR:** object storage + OCR pipeline (Tesseract/cloud OCR) later phase.
- **Multi-tenancy:** org-per-board/nazir with per-tenant jurisdiction rule pack.

## 6. Roadmap

- **Phase 1 (MVP):** M1 registry + M2 asset registry (basic map), M6 basic roles/governance, audit log. → A waqf board or nazir can digitize their portfolio.
- **Phase 2:** M3 leases + M4 fund accounting + M5 litigation. → Full back office, beats FEKRA + WAMSI combined.
- **Phase 3:** M7 cash waqf + M8 distribution + M10 public portal. → Donor-to-yield transparency, beats BWI/myWakaf.
- **Phase 4:** M9 investment/development, satellite change detection, AVM, blockchain anchoring, jurisdiction export packs.

*Research basis: WAMSI/UMEED (India), Saudi GAA, KAPF (Kuwait), JAWHAR/myWakaf/state eWakaf (Malaysia), BWI/SIWAK/CWLS (Indonesia), VGM/VBYS (Turkey), Awqaf Dubai/Abu Dhabi/Qatar, FEKRA, Odoo builds, LaunchGood/GlobalSadaqah/Ethis/Finterra; AAOIFI FAS 37 & GS 13; Waqf (Amendment) Act 2025; Indonesia Law 41/2004; Malaysian SIRC enactments. Full source links in research notes.*
