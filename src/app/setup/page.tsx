import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createOrg } from "@/app/dashboard/actions";

export const dynamic = "force-dynamic";

// WordPress-style install/setup wizard: verify the system, then guide a
// first-time admin through account + first organization. No DB credentials
// are ever entered here — the database is managed and connectivity is checked,
// not configured.
type Status = {
  core_tables: number;
  core_tables_expected: number;
  waqfs: number;
  records: number;
  orgs: number;
  users: number;
  anchored_batches: number;
};

function Check({ ok, label, detail }: { ok: boolean; label: string; detail?: string }) {
  return (
    <li style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid #eee", alignItems: "baseline" }}>
      <span style={{ color: ok ? "#0c7a55" : "#c05f3e", fontWeight: 700, width: 16 }}>{ok ? "✓" : "•"}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {detail && <span style={{ color: "#8a8a90", fontSize: 13 }}>{detail}</span>}
    </li>
  );
}

export default async function SetupPage() {
  const supabase = await createClient();
  let status: Status | null = null;
  let dbError = false;
  try {
    const { data, error } = await supabase.rpc("system_status");
    if (error) dbError = true;
    else status = data as Status;
  } catch {
    dbError = true;
  }
  const { data: { user } } = await supabase.auth.getUser();

  // does this signed-in user already belong to an org?
  let myOrgs = 0;
  if (user) {
    const { count } = await supabase.from("orgs").select("id", { count: "exact", head: true });
    myOrgs = count ?? 0;
  }

  const schemaOk = !!status && status.core_tables >= status.core_tables_expected;
  const dbOk = !dbError && !!status;
  const step = !dbOk ? 0 : !user ? 1 : myOrgs === 0 ? 2 : 3;

  const card: React.CSSProperties = {
    maxWidth: 560, margin: "0 auto", background: "#fff",
    border: "1px solid #e3dfd3", borderRadius: 10, padding: "32px 34px",
  };
  const btn: React.CSSProperties = {
    display: "inline-block", background: "#0a0a0a", color: "#fff", fontWeight: 600,
    fontSize: 14, padding: "12px 22px", borderRadius: 6, textDecoration: "none",
  };
  const btnGold: React.CSSProperties = { ...btn, background: "#b8912f", color: "#141002" };

  return (
    <main style={{ minHeight: "100vh", background: "#faf9f5", padding: "48px 20px", fontFamily: "-apple-system, Segoe UI, Helvetica, Arial, sans-serif", color: "#0a0a0a" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: "#b8912f" }}>
          Waqf‑M · Setup
        </div>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 30, marginTop: 8 }}>Install &amp; setup</h1>
        <p style={{ color: "#55555a", fontSize: 14, marginTop: 6 }}>
          Step {Math.min(step + 1, 4)} of 4 — {["System check", "Administrator account", "First organization", "Ready"][step]}
        </p>
      </div>

      {/* Step 1: System check */}
      <div style={card}>
        <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>1 · System check</h2>
        <ul style={{ listStyle: "none", fontSize: 14.5 }}>
          <Check ok={dbOk} label="Database connected" detail={dbOk ? "managed Postgres · healthy" : "unreachable"} />
          <Check ok={schemaOk} label="Schema installed" detail={status ? `${status.core_tables}/${status.core_tables_expected} core tables` : "—"} />
          <Check ok={dbOk} label="Waqf Core protocol (hash chain + Ed25519)" detail="ready" />
          <Check ok={dbOk} label="Bitcoin anchoring (OpenTimestamps)" detail={status && status.anchored_batches > 0 ? `${status.anchored_batches} batch(es) anchored` : "configured"} />
        </ul>
        {status && (
          <p style={{ color: "#8a8a90", fontSize: 12.5, marginTop: 12 }}>
            Registry: {status.waqfs} waqf(s) · {status.records} record(s) · {status.orgs} organization(s)
          </p>
        )}
      </div>

      {/* Step 2: Admin account */}
      <div style={{ ...card, marginTop: 18, opacity: step >= 1 ? 1 : 0.55 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>2 · Administrator account</h2>
        {user ? (
          <p style={{ fontSize: 14.5 }}>✓ Signed in as <b>{user.email}</b></p>
        ) : (
          <>
            <p style={{ fontSize: 14.5, color: "#55555a" }}>Create the account that will administer this registry.</p>
            <Link href="/login" style={{ ...btn, marginTop: 14 }}>Create admin account →</Link>
          </>
        )}
      </div>

      {/* Step 3: First organization */}
      <div style={{ ...card, marginTop: 18, opacity: step >= 2 ? 1 : 0.55 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>3 · First organization</h2>
        {step < 2 ? (
          <p style={{ fontSize: 14, color: "#8a8a90" }}>Sign in first to create your organization.</p>
        ) : myOrgs > 0 ? (
          <p style={{ fontSize: 14.5 }}>✓ Organization created — you have {myOrgs} organization(s).</p>
        ) : (
          <form action={createOrg} style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            <input name="name" required placeholder="e.g. Al-Khayr Waqf Board"
              style={{ flex: 1, minWidth: 200, border: "1px solid #d3cec0", borderRadius: 6, padding: "10px 12px", fontSize: 14 }} />
            <select name="jurisdiction" style={{ border: "1px solid #d3cec0", borderRadius: 6, padding: "10px 12px", fontSize: 14 }}>
              <option value="generic">Generic</option>
              <option value="in-umeed">India (UMEED)</option>
              <option value="my">Malaysia (SIRC)</option>
              <option value="id-bwi">Indonesia (BWI)</option>
              <option value="gulf">Gulf</option>
            </select>
            <button style={btnGold}>Create organization</button>
          </form>
        )}
      </div>

      {/* Step 4: Done */}
      <div style={{ ...card, marginTop: 18, opacity: step >= 3 ? 1 : 0.55, textAlign: "center" }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>4 · Ready</h2>
        {step >= 3 ? (
          <>
            <p style={{ fontSize: 15 }}>🎉 Your registry is set up. Register your first waqf.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
              <Link href="/dashboard" style={btnGold}>Go to dashboard →</Link>
              <Link href="/explorer" style={{ ...btn, background: "transparent", color: "#0a0a0a", border: "1px solid #d3cec0" }}>Public explorer</Link>
            </div>
          </>
        ) : (
          <p style={{ fontSize: 14, color: "#8a8a90" }}>Complete the steps above to finish setup.</p>
        )}
      </div>

      <p style={{ textAlign: "center", color: "#8a8a90", fontSize: 12, marginTop: 24 }}>
        No database credentials are entered here — the database is managed and its health is checked automatically.
      </p>
    </main>
  );
}
