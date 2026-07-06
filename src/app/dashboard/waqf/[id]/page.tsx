import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const EVENT_LABELS: Record<string, string> = {
  creation: "🕌 Waqf created",
  deed_registered: "📜 Deed registered",
  asset_added: "🏠 Asset added",
  asset_disposed: "🔄 Asset disposed (istibdal)",
  trustee_appointed: "🤝 Trustee appointed",
  trustee_removed: "⚠️ Trustee removed",
  audit: "🔍 Audit",
  inspection: "👁 Inspection",
  court_ruling: "⚖️ Court ruling",
  restoration: "🛠 Restoration",
  annual_report: "📊 Annual report",
  amendment: "✏️ Amendment",
  verification: "✅ Verification",
  lease_signed: "📝 Lease signed",
  lease_ended: "📪 Lease ended",
  case_filed: "⚖️ Case filed",
  case_resolved: "🏛 Case resolved",
  donation_received: "💝 Donation received",
  distribution_made: "🤲 Distribution made",
  investment_made: "📈 Investment made",
  project_started: "🏗 Project started",
  anchored: "⚓ Anchored",
};

export default async function WaqfDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: waqf } = await supabase
    .from("waqfs")
    .select("*")
    .eq("id", id)
    .single();
  if (!waqf) notFound();

  const [records, assets, leases, cases, balances, beneficiaries] =
    await Promise.all([
      supabase
        .from("waqf_records")
        .select("seq, event_type, payload, hash, recorded_at")
        .eq("waqf_id", id)
        .order("seq", { ascending: false }),
      supabase.from("assets").select("id, name, kind, status, current_valuation, valuation_currency").eq("waqf_id", id),
      supabase.from("leases").select("id, tenant_name, status, rent_amount, rent_currency, frequency, ends_on, market_rent_benchmark").eq("waqf_id", id),
      supabase.from("cases").select("id, title, kind, status, court, limitation_deadline").eq("waqf_id", id),
      supabase.from("fund_balances").select("fund, account, balance").eq("waqf_id", id),
      supabase.from("beneficiaries").select("id, name, share_pct, is_fallback").eq("waqf_id", id).eq("active", true),
    ]);

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-8">
      <header className="space-y-1">
        <Link href="/dashboard" className="text-xs text-neutral-400 hover:underline">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold">{waqf.name}</h1>
        <p className="text-sm text-neutral-500">
          {waqf.waqf_type} · {waqf.tenure} · {waqf.madhab} · founded by{" "}
          {waqf.waqif_name}
          {waqf.is_public && (
            <>
              {" · "}
              <Link href={`/api/waqf/${id}/verify`} className="text-emerald-700 hover:underline">
                verify chain publicly
              </Link>
            </>
          )}
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-2">
        <section className="space-y-2">
          <h2 className="font-semibold">Assets ({assets.data?.length ?? 0})</h2>
          {assets.data?.map((a) => (
            <div key={a.id} className="rounded border border-neutral-200 p-2 text-sm">
              <span className="font-medium">{a.name}</span>{" "}
              <span className="text-neutral-400">
                {a.kind} ·{" "}
                <span className={a.status === "encroached" || a.status === "under_litigation" ? "text-red-600" : ""}>
                  {a.status}
                </span>
                {a.current_valuation ? ` · ${a.current_valuation} ${a.valuation_currency}` : ""}
              </span>
            </div>
          ))}
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold">Leases ({leases.data?.length ?? 0})</h2>
          {leases.data?.map((l) => {
            const under =
              l.market_rent_benchmark && Number(l.rent_amount) < Number(l.market_rent_benchmark);
            return (
              <div key={l.id} className="rounded border border-neutral-200 p-2 text-sm">
                <span className="font-medium">{l.tenant_name}</span>{" "}
                <span className="text-neutral-400">
                  {l.rent_amount} {l.rent_currency}/{l.frequency} · {l.status} · until {l.ends_on}
                </span>
                {under && (
                  <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                    below market ({l.market_rent_benchmark})
                  </span>
                )}
              </div>
            );
          })}
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold">Cases ({cases.data?.length ?? 0})</h2>
          {cases.data?.map((c) => (
            <div key={c.id} className="rounded border border-neutral-200 p-2 text-sm">
              <span className="font-medium">{c.title}</span>{" "}
              <span className="text-neutral-400">
                {c.kind} · {c.status}
                {c.court ? ` · ${c.court}` : ""}
                {c.limitation_deadline ? ` · limitation ${c.limitation_deadline}` : ""}
              </span>
            </div>
          ))}
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold">
            Beneficiaries ({beneficiaries.data?.length ?? 0}) &amp; Funds
          </h2>
          {beneficiaries.data?.map((b) => (
            <div key={b.id} className="rounded border border-neutral-200 p-2 text-sm">
              {b.name}
              {b.share_pct ? ` · ${b.share_pct}%` : ""}
              {b.is_fallback ? " · fallback" : ""}
            </div>
          ))}
          {balances.data?.length ? (
            <table className="w-full text-xs">
              <tbody>
                {balances.data.map((f, i) => (
                  <tr key={i} className="border-t border-neutral-100">
                    <td className="p-1 font-mono">{f.fund}</td>
                    <td className="p-1">{f.account}</td>
                    <td className="p-1 text-right font-mono">{f.balance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-neutral-400">
              corpus &amp; income funds ready — no journal entries yet
            </p>
          )}
        </section>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">
          Ledger of record — {records.data?.length ?? 0} chained events
        </h2>
        <ol className="relative space-y-4 border-l border-neutral-200 pl-6">
          {records.data?.map((r) => (
            <li key={r.seq} className="relative">
              <span className="absolute -left-[1.85rem] top-1 h-3 w-3 rounded-full bg-emerald-600" />
              <div className="text-sm font-medium">
                {EVENT_LABELS[r.event_type] ?? r.event_type}
                <span className="ml-2 text-xs font-normal text-neutral-400">
                  #{r.seq} · {new Date(r.recorded_at).toLocaleString()}
                </span>
              </div>
              <div className="font-mono text-xs text-neutral-400">
                {r.hash.slice(0, 32)}…
              </div>
              {r.payload && Object.keys(r.payload).length > 0 && (
                <pre className="mt-1 max-w-full overflow-x-auto rounded bg-neutral-50 p-2 text-xs text-neutral-600">
                  {JSON.stringify(r.payload, null, 1)}
                </pre>
              )}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
