import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { createOrg, createWaqf } from "./actions";

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

  return (
    <main className="mx-auto max-w-4xl space-y-10 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Waqf‑M · Registry</h1>
        <form action={signOut}>
          <button className="text-sm text-neutral-500 hover:underline">
            Sign out
          </button>
        </form>
      </header>

      {error && (
        <p className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Organizations</h2>
        {(orgs as Org[] | null)?.length ? (
          <ul className="space-y-1 text-sm">
            {(orgs as Org[]).map((o) => (
              <li key={o.id} className="rounded border border-neutral-200 p-2">
                {o.name}{" "}
                <span className="text-neutral-400">({o.jurisdiction})</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">
            No organization yet — create your waqf board or nazir organization:
          </p>
        )}
        <form action={createOrg} className="flex flex-wrap gap-2">
          <input
            name="name"
            required
            placeholder="Organization name"
            className="rounded border border-neutral-300 p-2 text-sm"
          />
          <select
            name="jurisdiction"
            className="rounded border border-neutral-300 p-2 text-sm"
          >
            <option value="generic">Generic</option>
            <option value="in-umeed">India (UMEED)</option>
            <option value="my">Malaysia (SIRC)</option>
            <option value="id-bwi">Indonesia (BWI)</option>
            <option value="gulf">Gulf</option>
          </select>
          <button className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700">
            Create
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Waqfs</h2>
        {(waqfs as Waqf[] | null)?.length ? (
          <table className="w-full text-left text-sm">
            <thead className="text-neutral-500">
              <tr>
                <th className="p-2">Name</th>
                <th className="p-2">Type</th>
                <th className="p-2">Tenure</th>
                <th className="p-2">Madhab</th>
                <th className="p-2">Waqif</th>
                <th className="p-2">Public</th>
              </tr>
            </thead>
            <tbody>
              {(waqfs as Waqf[]).map((w) => (
                <tr key={w.id} className="border-t border-neutral-200">
                  <td className="p-2 font-medium">{w.name}</td>
                  <td className="p-2">{w.waqf_type}</td>
                  <td className="p-2">{w.tenure}</td>
                  <td className="p-2">{w.madhab}</td>
                  <td className="p-2">{w.waqif_name}</td>
                  <td className="p-2">{w.is_public ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-neutral-500">No waqfs registered yet.</p>
        )}

        {(orgs as Org[] | null)?.length ? (
          <form
            action={createWaqf}
            className="grid grid-cols-2 gap-2 rounded border border-neutral-200 p-4 md:grid-cols-3"
          >
            <select
              name="org_id"
              required
              className="rounded border border-neutral-300 p-2 text-sm"
            >
              {(orgs as Org[]).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            <input
              name="name"
              required
              placeholder="Waqf name"
              className="rounded border border-neutral-300 p-2 text-sm"
            />
            <input
              name="waqif_name"
              required
              placeholder="Waqif (founder) name"
              className="rounded border border-neutral-300 p-2 text-sm"
            />
            <select
              name="waqf_type"
              className="rounded border border-neutral-300 p-2 text-sm"
            >
              <option value="khayri">Khayri (charitable)</option>
              <option value="ahli">Ahli (family)</option>
              <option value="mushtarak">Mushtarak (mixed)</option>
              <option value="cash">Cash</option>
              <option value="corporate">Corporate</option>
            </select>
            <select
              name="madhab"
              className="rounded border border-neutral-300 p-2 text-sm"
            >
              <option value="hanafi">Hanafi</option>
              <option value="maliki">Maliki</option>
              <option value="shafii">Shafi&apos;i</option>
              <option value="hanbali">Hanbali</option>
              <option value="jaafari">Ja&apos;fari</option>
              <option value="other">Other</option>
            </select>
            <select
              name="tenure"
              className="rounded border border-neutral-300 p-2 text-sm"
            >
              <option value="perpetual">Perpetual</option>
              <option value="temporary">Temporary</option>
            </select>
            <input
              name="expires_on"
              type="date"
              className="rounded border border-neutral-300 p-2 text-sm"
              title="Expiry (temporary waqf only)"
            />
            <input
              name="declaration_date"
              type="date"
              className="rounded border border-neutral-300 p-2 text-sm"
              title="Declaration date"
            />
            <label className="flex items-center gap-2 text-sm">
              <input name="is_public" type="checkbox" defaultChecked /> Public
              registry
            </label>
            <button className="col-span-full rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600">
              Register waqf
            </button>
          </form>
        ) : null}
      </section>
    </main>
  );
}
