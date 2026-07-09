import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createOrg, createWaqf } from "./actions";
import Shell, {
  PageHeader,
  Card,
  EmptyState,
  Alert,
  Field,
  inputCls,
  btnPrimary,
  btnGold,
} from "@/components/Shell";

type Org = { id: string; name: string; jurisdiction: string };
type Waqf = {
  id: string;
  org_id: string;
  name: string;
  waqf_type: string;
  tenure: string;
  madhab: string;
  waqif_name: string;
  is_public: boolean;
};

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: orgs } = await supabase.from("orgs").select("*").order("name");
  const { data: waqfs } = await supabase
    .from("waqfs")
    .select("*")
    .order("created_at", { ascending: false });

  const orgList = (orgs ?? []) as Org[];
  const waqfList = (waqfs ?? []) as Waqf[];

  return (
    <Shell variant="app" active="dashboard">
      <PageHeader
        eyebrow="Registry"
        title="Dashboard"
        subtitle="Your organizations and registered awqāf, backed by a verifiable hash chain."
      />

      {error && <Alert kind="error">{error}</Alert>}

      <div className="space-y-8">
        <Card title="Organizations">
          {orgList.length ? (
            <ul className="mb-5 divide-y divide-line rounded-md border border-line">
              {orgList.map((o) => (
                <li key={o.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="font-medium">{o.name}</span>
                  <span className="rounded-full border border-line bg-ivory px-2.5 py-0.5 text-xs text-muted">
                    {o.jurisdiction}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mb-5">
              <EmptyState>
                No organization yet — create your waqf board or nazir organization below.
              </EmptyState>
            </div>
          )}
          <form action={createOrg} className="flex flex-wrap items-end gap-3">
            <Field label="Organization name" className="min-w-[220px] flex-1">
              <input name="name" required placeholder="e.g. Al-Khayr Waqf Board" className={inputCls} />
            </Field>
            <Field label="Jurisdiction">
              <select name="jurisdiction" className={inputCls}>
                <option value="generic">Generic</option>
                <option value="in-umeed">India (UMEED)</option>
                <option value="my">Malaysia (SIRC)</option>
                <option value="id-bwi">Indonesia (BWI)</option>
                <option value="gulf">Gulf</option>
              </select>
            </Field>
            <button className={btnPrimary}>Create organization</button>
          </form>
        </Card>

        <Card title={`Waqfs (${waqfList.length})`}>
          {waqfList.length ? (
            <div className="overflow-x-auto rounded-md border border-line">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-ivory text-xs uppercase tracking-wide text-faint">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Name</th>
                    <th className="px-4 py-2.5 font-semibold">Type</th>
                    <th className="px-4 py-2.5 font-semibold">Tenure</th>
                    <th className="px-4 py-2.5 font-semibold">Madhab</th>
                    <th className="px-4 py-2.5 font-semibold">Waqif</th>
                    <th className="px-4 py-2.5 font-semibold">Public</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {waqfList.map((w) => (
                    <tr key={w.id} className="transition-colors hover:bg-ivory/60">
                      <td className="px-4 py-3 font-medium">
                        <a href={`/dashboard/waqf/${w.id}`} className="text-verify hover:underline">
                          {w.name}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-muted">{w.waqf_type}</td>
                      <td className="px-4 py-3 text-muted">{w.tenure}</td>
                      <td className="px-4 py-3 text-muted">{w.madhab}</td>
                      <td className="px-4 py-3 text-muted">{w.waqif_name}</td>
                      <td className="px-4 py-3">
                        {w.is_public ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-verify">
                            Public
                          </span>
                        ) : (
                          <span className="rounded-full bg-ivory px-2 py-0.5 text-xs text-faint">
                            Private
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState>No waqfs yet — register your first one below.</EmptyState>
          )}
        </Card>

        {orgList.length ? (
          <Card title="Register a waqf">
            <form action={createWaqf} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Organization">
                <select name="org_id" required className={inputCls}>
                  {orgList.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Waqf name">
                <input name="name" required placeholder="e.g. Masjid Al-Noor Endowment" className={inputCls} />
              </Field>
              <Field label="Waqif (founder) name">
                <input name="waqif_name" required placeholder="Founder's full name" className={inputCls} />
              </Field>
              <Field label="Type">
                <select name="waqf_type" className={inputCls}>
                  <option value="khayri">Khayri (charitable)</option>
                  <option value="ahli">Ahli (family)</option>
                  <option value="mushtarak">Mushtarak (mixed)</option>
                  <option value="cash">Cash</option>
                  <option value="corporate">Corporate</option>
                </select>
              </Field>
              <Field label="Madhab">
                <select name="madhab" className={inputCls}>
                  <option value="hanafi">Hanafi</option>
                  <option value="maliki">Maliki</option>
                  <option value="shafii">Shafi&apos;i</option>
                  <option value="hanbali">Hanbali</option>
                  <option value="jaafari">Ja&apos;fari</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Tenure">
                <select name="tenure" className={inputCls}>
                  <option value="perpetual">Perpetual</option>
                  <option value="temporary">Temporary</option>
                </select>
              </Field>
              <Field label="Expiry (temporary waqf only)">
                <input name="expires_on" type="date" className={inputCls} />
              </Field>
              <Field label="Declaration date">
                <input name="declaration_date" type="date" className={inputCls} />
              </Field>
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input name="is_public" type="checkbox" defaultChecked className="h-4 w-4 accent-gold" />
                List in the public registry
              </label>
              <div className="col-span-full">
                <button className={btnGold}>Register waqf</button>
              </div>
            </form>
          </Card>
        ) : null}

        <p className="text-center text-xs text-faint">
          Every registration writes a chained, signable event.{" "}
          <Link href="/explorer" className="underline decoration-line2 underline-offset-4 hover:text-ink">
            View the public explorer
          </Link>
        </p>
      </div>
    </Shell>
  );
}
