import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CreateBatchButton, SubmitAnchorButton } from "./AnchorControls";
import Shell, { PageHeader, Card, EmptyState } from "@/components/Shell";

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

  const waqfList = (waqfs ?? []) as PubWaqf[];
  const batchList = (batches ?? []) as Batch[];

  return (
    <Shell variant="public" active="explorer">
      <PageHeader
        eyebrow="Public Explorer"
        title="Open waqf registry"
        subtitle="Every public waqf has a verifiable hash chain — anyone can audit it without trusting us."
      />

      <div className="space-y-8">
        <Card title={`Public waqfs (${waqfList.length})`}>
          {waqfList.length ? (
            <ul className="space-y-3">
              {waqfList.map((w) => (
                <li key={w.id} className="rounded-md border border-line p-4 transition-colors hover:border-line2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{w.name}</span>
                    <span className="flex gap-1.5">
                      {[w.waqf_type, w.tenure, w.madhab].map((t) => (
                        <span key={t} className="rounded-full border border-line bg-ivory px-2 py-0.5 text-xs text-muted">
                          {t}
                        </span>
                      ))}
                    </span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    <Link className="font-medium text-verify hover:underline" href={`/api/waqf/${w.id}/history`}>
                      Event history
                    </Link>
                    <Link className="font-medium text-verify hover:underline" href={`/api/waqf/${w.id}/verify`}>
                      Verify chain
                    </Link>
                    <Link className="font-medium text-verify hover:underline" href={`/api/waqf/${w.id}/proof`}>
                      Merkle proof
                    </Link>
                    <span className="font-mono text-faint">id: {w.id}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>No public waqfs yet — they&apos;ll appear here once registered.</EmptyState>
          )}
        </Card>

        <Card title="Anchor batches" action={<CreateBatchButton />}>
          <p className="mb-4 text-xs leading-relaxed text-faint">
            Records are periodically merkle-batched; the root is submitted to independent
            OpenTimestamps calendar servers, which upgrade the proof to a Bitcoin block
            confirmation over time.
          </p>
          {batchList.length ? (
            <ul className="space-y-3">
              {batchList.map((b) => (
                <li key={b.id} className="rounded-md border border-line p-4">
                  <div className="break-all font-mono text-xs text-muted">
                    root {b.merkle_root}
                  </div>
                  <div className="mt-1 text-xs text-faint">{b.record_count} records</div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                    {b.anchored_at ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-medium text-verify">
                        ✓ anchored {new Date(b.anchored_at).toLocaleString()} (
                        {b.external_anchor?.calendars?.filter((c) => c.ok).length ?? 0} calendars)
                      </span>
                    ) : (
                      <>
                        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 font-medium text-amber-800">
                          pending anchor
                        </span>
                        <SubmitAnchorButton batchId={b.id} />
                      </>
                    )}
                    {b.anchored_at && (
                      <>
                        <Link className="font-medium text-verify hover:underline" href={`/anchor/${b.id}`}>
                          Verify on Bitcoin ↗
                        </Link>
                        <a className="font-medium text-verify hover:underline" href={`/chain/api/anchor/${b.id}/ots`}>
                          Download .ots proof
                        </a>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>No batches yet.</EmptyState>
          )}
        </Card>
      </div>
    </Shell>
  );
}
