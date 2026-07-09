import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CreateBatchButton, SubmitAnchorButton } from "./AnchorControls";

export const dynamic = "force-dynamic";

type PubWaqf = {
  id: string;
  name: string;
  waqf_type: string;
  tenure: string;
  madhab: string;
  created_at: string;
};
type Batch = {
  id: string;
  merkle_root: string;
  record_count: number;
  anchored_at: string | null;
  created_at: string;
  external_anchor: { calendars?: { calendar: string; ok: boolean }[] } | null;
};

export default async function Explorer() {
  const supabase = await createClient();
  const { data: waqfs } = await supabase
    .from("waqfs")
    .select("id, name, waqf_type, tenure, madhab, created_at")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(100);
  const { data: batches } = await supabase
    .from("anchor_batches_public")
    .select("id, merkle_root, record_count, anchored_at, created_at, external_anchor")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <main className="mx-auto max-w-4xl space-y-10 p-8">
      <header>
        <h1 className="text-2xl font-bold">Waqf‑M · Public Explorer</h1>
        <p className="text-sm text-neutral-500">
          Open registry of public waqfs. Every waqf has a verifiable hash
          chain; anyone can audit it without trusting us.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Public waqfs</h2>
        {(waqfs as PubWaqf[] | null)?.length ? (
          <ul className="space-y-2">
            {(waqfs as PubWaqf[]).map((w) => (
              <li key={w.id} className="rounded border border-neutral-200 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{w.name}</span>
                  <span className="text-neutral-400">
                    {w.waqf_type} · {w.tenure} · {w.madhab}
                  </span>
                </div>
                <div className="mt-1 flex gap-4 text-xs">
                  <Link className="text-emerald-700 hover:underline" href={`/api/waqf/${w.id}/history`}>
                    event history
                  </Link>
                  <Link className="text-emerald-700 hover:underline" href={`/api/waqf/${w.id}/verify`}>
                    verify chain
                  </Link>
                  <span className="text-neutral-400">id: {w.id}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">No public waqfs yet.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Anchor batches</h2>
        <p className="text-xs text-neutral-400">
          Records are periodically merkle-batched; the root is submitted to
          independent OpenTimestamps calendar servers, which upgrade the proof
          to a Bitcoin block confirmation over time.
        </p>
        <CreateBatchButton />
        {(batches as Batch[] | null)?.length ? (
          <ul className="space-y-1 text-xs font-mono">
            {(batches as Batch[]).map((b) => (
              <li key={b.id} className="space-y-1 rounded border border-neutral-200 p-2">
                <div className="break-all">
                  root {b.merkle_root} · {b.record_count} records
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  {b.anchored_at ? (
                    <span className="text-emerald-700">
                      anchored {new Date(b.anchored_at).toLocaleString()} (
                      {b.external_anchor?.calendars?.filter((c) => c.ok).length ?? 0} calendars)
                    </span>
                  ) : (
                    <>
                      <span className="text-amber-700">pending anchor</span>
                      <SubmitAnchorButton batchId={b.id} />
                    </>
                  )}
                  {b.anchored_at && (
                    <>
                      <Link className="text-emerald-700 hover:underline" href={`/api/anchor/${b.id}/bitcoin`}>
                        verify on Bitcoin ↗
                      </Link>
                      <a className="text-emerald-700 hover:underline" href={`/api/anchor/${b.id}/ots`}>
                        download .ots proof
                      </a>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">No batches yet.</p>
        )}
      </section>
    </main>
  );
}
