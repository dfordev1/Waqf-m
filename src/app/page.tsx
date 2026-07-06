import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-5xl font-bold tracking-tight">Waqf‑M</h1>
      <p className="max-w-xl text-center text-lg text-neutral-500">
        The end-to-end waqf management platform — registry, assets, governance,
        and a perpetual ledger of record. Built on AAOIFI standards.
      </p>
      <div className="flex gap-3">
        <Link
          href="/login"
          className="rounded bg-emerald-700 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-600"
        >
          Sign in / Sign up
        </Link>
        <Link
          href="/dashboard"
          className="rounded border border-neutral-300 px-6 py-3 text-sm font-medium hover:bg-neutral-100"
        >
          Dashboard
        </Link>
        <Link
          href="/explorer"
          className="rounded border border-neutral-300 px-6 py-3 text-sm font-medium hover:bg-neutral-100"
        >
          Public Explorer
        </Link>
      </div>
      <p className="text-xs text-neutral-400">
        Registry &middot; Assets &amp; GIS &middot; Leases &amp; Litigation &middot; FAS 37 Accounting &middot; Cash Waqf &amp; Distributions &middot; Investments &middot; Bitcoin-Anchored Ledger
      </p>
    </main>
  );
}
