export const metadata = { title: "Terms of Service · Waqf‑M" };

export default function Terms() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-8 text-sm leading-relaxed text-neutral-700">
      <h1 className="text-2xl font-bold text-neutral-900">Terms of Service</h1>
      <p className="text-xs text-neutral-400">
        Draft — last updated 6 July 2026. This draft has not yet been reviewed
        by legal counsel.
      </p>

      <h2 className="pt-2 font-semibold text-neutral-900">1. The service</h2>
      <p>
        Waqf‑M is a record-keeping and management platform for waqf (Islamic
        endowment) organizations. It provides registries, document storage,
        accounting tools, and cryptographic verification of records.
      </p>

      <h2 className="pt-2 font-semibold text-neutral-900">2. Not legal or religious advice</h2>
      <p>
        Waqf‑M is a tool, not an authority. Nothing in the platform —
        including rule packs, accounting treatments, istibdal workflows, or
        madhab-related options — constitutes legal advice, a fatwa, or a
        Shariah ruling. Consult qualified scholars and legal counsel before
        relying on any output for binding decisions.
      </p>

      <h2 className="pt-2 font-semibold text-neutral-900">3. Your data and records</h2>
      <p>
        You retain ownership of the data you enter. Records marked public are
        visible to anyone, including through the public explorer and APIs.
        Chained records and signatures are append-only by design: once written
        they cannot be edited or deleted, and hashes of records may be
        anchored to external timestamping services. Do not enter information
        into chained records that you may later need to erase.
      </p>

      <h2 className="pt-2 font-semibold text-neutral-900">4. Cryptographic keys</h2>
      <p>
        Private signing keys are generated for you but never stored by the
        service. You are solely responsible for safeguarding them. A lost key
        cannot be recovered; a leaked key can sign in your name.
      </p>

      <h2 className="pt-2 font-semibold text-neutral-900">5. Acceptable use</h2>
      <p>
        You may not use the service to record fraudulent claims, infringe
        others&apos; property rights, or misrepresent the legal status of any
        asset. You are responsible for the accuracy of records you create.
      </p>

      <h2 className="pt-2 font-semibold text-neutral-900">6. No warranty</h2>
      <p>
        The service is provided &quot;as is&quot; without warranties of any
        kind. We do not guarantee uninterrupted availability or that records
        satisfy the evidentiary requirements of any particular jurisdiction.
      </p>
    </main>
  );
}
