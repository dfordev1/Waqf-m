export const metadata = { title: "Privacy Policy · Waqf‑M" };

export default function Privacy() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-8 text-sm leading-relaxed text-neutral-700">
      <h1 className="text-2xl font-bold text-neutral-900">Privacy Policy</h1>
      <p className="text-xs text-neutral-400">
        Draft — last updated 6 July 2026. This draft has not yet been reviewed
        by legal counsel.
      </p>

      <h2 className="pt-2 font-semibold text-neutral-900">What we collect</h2>
      <p>
        Account data (email, authentication records), the organizational and
        waqf data you enter (assets, leases, cases, beneficiaries, donations,
        accounting entries), uploaded documents, and standard technical logs.
      </p>

      <h2 className="pt-2 font-semibold text-neutral-900">How it is used</h2>
      <p>
        Solely to operate the platform: authentication, record keeping,
        verification, and the transparency features you choose to enable. We
        do not sell personal data.
      </p>

      <h2 className="pt-2 font-semibold text-neutral-900">Public vs. private data</h2>
      <p>
        Records belonging to a waqf marked <em>public</em> are visible to
        anyone via the explorer and public APIs — but only as proofs (event
        types, hashes, timestamps). Record contents, beneficiary personal
        data, and documents remain restricted to your organization&apos;s
        members. Donor names on donations are visible to your organization;
        donors may give anonymously.
      </p>

      <h2 className="pt-2 font-semibold text-neutral-900">Append-only records</h2>
      <p>
        Chained protocol records are immutable by design, and their hashes may
        be anchored to external timestamping networks. Personal data should
        not be placed in chained record payloads; where it is, erasure of the
        payload may be legally and technically constrained. Ordinary
        (non-chained) data can be corrected or deleted on request.
      </p>

      <h2 className="pt-2 font-semibold text-neutral-900">Storage and processors</h2>
      <p>
        Data is stored with Supabase (hosted PostgreSQL and object storage).
        Document downloads use short-lived signed URLs. Hash digests — never
        document contents — are transmitted to OpenTimestamps calendar
        servers when anchoring is used.
      </p>

      <h2 className="pt-2 font-semibold text-neutral-900">Your rights</h2>
      <p>
        You may request access to, correction of, or deletion of your personal
        data (subject to the append-only constraints above) by contacting the
        operator of this deployment.
      </p>
    </main>
  );
}
