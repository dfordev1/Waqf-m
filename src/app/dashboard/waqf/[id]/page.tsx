import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  addAsset,
  addLease,
  addCase,
  addBeneficiary,
  addDistribution,
  addCampaign,
  recordDonation,
  addInvestment,
} from "./actions";

const inp = "rounded border border-neutral-300 p-2 text-sm";
const btn =
  "rounded bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600";

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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: waqf } = await supabase
    .from("waqfs")
    .select("*")
    .eq("id", id)
    .single();
  if (!waqf) notFound();

  const [records, assets, leases, cases, balances, beneficiaries, campaigns] =
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
      supabase.from("campaigns").select("id, title, status").eq("waqf_id", id),
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

      {error && (
        <p className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </p>
      )}

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

      <section className="space-y-2">
        <h2 className="font-semibold">Actions</h2>
        {[
          {
            label: "➕ Add asset",
            action: addAsset,
            fields: (
              <>
                <input name="name" required placeholder="Asset name" className={inp} />
                <select name="kind" className={inp}>
                  {["land", "building", "movable", "cash", "shares", "ip", "other"].map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
                <input name="address" placeholder="Address" className={inp} />
                <input name="area_sqm" type="number" placeholder="Area (sqm)" className={inp} />
                <input name="current_valuation" type="number" placeholder="Valuation" className={inp} />
                <input name="title_reference" placeholder="Title/deed ref" className={inp} />
              </>
            ),
          },
          {
            label: "📝 New lease",
            action: addLease,
            fields: (
              <>
                <select name="asset_id" required className={inp}>
                  {assets.data?.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <input name="tenant_name" required placeholder="Tenant name" className={inp} />
                <input name="tenant_contact" placeholder="Tenant contact" className={inp} />
                <select name="status" className={inp}>
                  <option value="draft">draft</option>
                  <option value="active">active (writes chain event)</option>
                </select>
                <input name="starts_on" type="date" required className={inp} title="Start" />
                <input name="ends_on" type="date" required className={inp} title="End" />
                <input name="rent_amount" type="number" step="0.01" required placeholder="Rent amount" className={inp} />
                <select name="frequency" className={inp}>
                  <option>monthly</option><option>quarterly</option><option>yearly</option>
                </select>
                <input name="market_rent_benchmark" type="number" placeholder="Market rent (benchmark)" className={inp} />
              </>
            ),
          },
          {
            label: "⚖️ File case",
            action: addCase,
            fields: (
              <>
                <input name="title" required placeholder="Case title" className={inp} />
                <select name="kind" className={inp}>
                  {["encroachment", "title_dispute", "tenancy", "succession", "regulatory", "other"].map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
                <select name="asset_id" className={inp}>
                  <option value="">(no asset)</option>
                  {assets.data?.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <input name="case_number" placeholder="Case number" className={inp} />
                <input name="court" placeholder="Court" className={inp} />
                <input name="counsel" placeholder="Counsel" className={inp} />
                <input name="filed_on" type="date" className={inp} title="Filed on" />
                <input name="limitation_deadline" type="date" className={inp} title="Limitation deadline" />
              </>
            ),
          },
          {
            label: "👥 Add beneficiary",
            action: addBeneficiary,
            fields: (
              <>
                <input name="name" required placeholder="Beneficiary / class name" className={inp} />
                <select name="kind" className={inp}>
                  <option>class</option><option>person</option><option>organization</option>
                </select>
                <input name="share_pct" type="number" step="0.01" placeholder="Share %" className={inp} />
                <label className="flex items-center gap-2 text-sm">
                  <input name="is_fallback" type="checkbox" /> fallback (the poor)
                </label>
              </>
            ),
          },
          {
            label: "🤲 Record distribution",
            action: addDistribution,
            fields: (
              <>
                <select name="beneficiary_id" required className={inp}>
                  {beneficiaries.data?.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <input name="amount" type="number" step="0.01" required placeholder="Amount" className={inp} />
                <input name="memo" placeholder="Memo" className={inp} />
              </>
            ),
          },
          {
            label: "💰 New campaign",
            action: addCampaign,
            fields: (
              <>
                <input name="title" required placeholder="Campaign title" className={inp} />
                <select name="status" className={inp}>
                  <option>draft</option><option>live</option>
                </select>
                <input name="goal_amount" type="number" placeholder="Goal amount" className={inp} />
              </>
            ),
          },
          {
            label: "💝 Record donation",
            action: recordDonation,
            fields: (
              <>
                <select name="campaign_id" required className={inp}>
                  {campaigns.data?.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
                <input name="donor_name" placeholder="Donor (blank = anonymous)" className={inp} />
                <input name="amount" type="number" step="0.01" required placeholder="Amount" className={inp} />
              </>
            ),
          },
          {
            label: "📈 New investment",
            action: addInvestment,
            fields: (
              <>
                <input name="name" required placeholder="Investment name" className={inp} />
                <select name="kind" className={inp}>
                  {["sukuk", "cwls", "equity", "islamic_deposit", "real_estate", "business", "other"].map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
                <select name="status" className={inp}>
                  <option value="proposed">proposed</option>
                  <option value="active">active (requires screening)</option>
                </select>
                <input name="principal" type="number" step="0.01" required placeholder="Principal" className={inp} />
                <input name="expected_yield_pct" type="number" step="0.01" placeholder="Expected yield %" className={inp} />
                <label className="flex items-center gap-2 text-sm">
                  <input name="shariah_screened" type="checkbox" /> Shariah screened
                </label>
              </>
            ),
          },
        ].map(({ label, action, fields }) => (
          <details key={label} className="rounded border border-neutral-200">
            <summary className="cursor-pointer p-2 text-sm font-medium hover:bg-neutral-50">
              {label}
            </summary>
            <form action={action} className="grid grid-cols-2 gap-2 p-3 md:grid-cols-3">
              <input type="hidden" name="org_id" value={waqf.org_id} />
              <input type="hidden" name="waqf_id" value={waqf.id} />
              {fields}
              <button className={btn}>Save</button>
            </form>
          </details>
        ))}
      </section>

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
