import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const MAGIC = Buffer.from([
  0x00, ...Buffer.from("OpenTimestamps"), 0x00, 0x00,
  ...Buffer.from("Proof"), 0x00,
  0xbf, 0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94,
]);

type Att = {
  calendar: string;
  status: "confirmed" | "pending" | "error";
  height?: number;
  time?: string;
};

async function verifyBatch(root: string, cals: { calendar: string; proof_base64?: string }[]) {
  const OTS = (await import("opentimestamps")).default;
  const { Ops, Context, DetachedTimestampFile } = OTS;
  const digest = Buffer.from(root, "hex");
  const out: Att[] = [];
  for (const c of cals) {
    if (!c.proof_base64) continue;
    try {
      const ots = Buffer.concat([
        MAGIC, Buffer.from([0x01]), Buffer.from([0x08]),
        digest, Buffer.from(c.proof_base64, "base64"),
      ]);
      const d = DetachedTimestampFile.deserialize(
        new Context.StreamDeserialization(Uint8Array.from(ots))
      );
      const original = DetachedTimestampFile.fromHash(new Ops.OpSHA256(), Uint8Array.from(digest));
      await OTS.upgrade(d);
      const r = await OTS.verify(d, original);
      const btc = r?.bitcoin;
      if (btc?.timestamp)
        out.push({ calendar: c.calendar, status: "confirmed", height: btc.height, time: new Date(btc.timestamp * 1000).toISOString() });
      else out.push({ calendar: c.calendar, status: "pending" });
    } catch {
      out.push({ calendar: c.calendar, status: "error" });
    }
  }
  return out;
}

export default async function AnchorVerifyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: batch } = await supabase
    .from("anchor_batches_public")
    .select("merkle_root, record_count, external_anchor")
    .eq("id", id)
    .single();

  if (!batch)
    return <main className="mx-auto max-w-2xl p-8"><p>Batch not found.</p></main>;

  const anchor = batch.external_anchor as
    | { calendars?: { calendar: string; ok: boolean; proof_base64?: string }[] }
    | null;
  const cals = (anchor?.calendars ?? []).filter((c) => c.ok);
  const atts = cals.length ? await verifyBatch(batch.merkle_root, cals) : [];
  const confirmed = atts.find((a) => a.status === "confirmed");

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8">
      <Link href="/explorer" className="text-sm text-neutral-500 hover:underline">← Explorer</Link>
      <h1 className="text-2xl font-bold">Bitcoin anchor verification</h1>

      <div className="rounded border border-neutral-200 p-4 text-sm">
        <div className="text-neutral-500">Merkle root of this batch ({batch.record_count} records)</div>
        <div className="mt-1 break-all font-mono text-xs">{batch.merkle_root}</div>
      </div>

      {confirmed ? (
        <div className="rounded border border-emerald-300 bg-emerald-50 p-4">
          <div className="text-lg font-semibold text-emerald-800">
            ✓ Permanently committed to the Bitcoin blockchain
          </div>
          <p className="mt-1 text-sm text-emerald-900">
            This exact Merkle root is embedded in <b>Bitcoin block {confirmed.height}</b>,
            mined {new Date(confirmed.time!).toUTCString()}.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <a
              className="rounded bg-emerald-700 px-3 py-2 font-medium text-white hover:bg-emerald-800"
              href={`https://mempool.space/block-height/${confirmed.height}`}
              target="_blank" rel="noreferrer"
            >
              See block {confirmed.height} on mempool.space ↗
            </a>
            <a
              className="rounded border border-emerald-700 px-3 py-2 font-medium text-emerald-800 hover:bg-emerald-100"
              href={`/chain/api/anchor/${id}/ots`}
            >
              Download .ots proof
            </a>
          </div>
        </div>
      ) : (
        <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="text-base font-semibold">⏳ Awaiting Bitcoin confirmation</div>
          <p className="mt-1">
            The root has been submitted to independent OpenTimestamps calendar servers and
            is waiting to be included in a Bitcoin block. This upgrades automatically —
            usually within a few hours. The .ots proof is already downloadable below.
          </p>
          <a className="mt-3 inline-block rounded border border-amber-700 px-3 py-2 font-medium" href={`/chain/api/anchor/${id}/ots`}>
            Download .ots proof
          </a>
        </div>
      )}

      <div className="rounded border border-neutral-200 p-4 text-sm">
        <div className="font-semibold">Don&apos;t trust us — verify it yourself</div>
        <p className="mt-1 text-neutral-600">
          This page ran the check on our server for convenience. For a fully independent
          verification that trusts nothing of ours: download the <b>.ots</b> proof above and
          drop it into the official verifier, or run <code className="rounded bg-neutral-100 px-1">ots verify</code> with the OpenTimestamps CLI.
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <a className="text-emerald-700 hover:underline" href="https://opentimestamps.org" target="_blank" rel="noreferrer">
            opentimestamps.org ↗
          </a>
          <Link className="text-emerald-700 hover:underline" href={`/api/anchor/${id}/bitcoin`}>
            raw JSON result
          </Link>
        </div>
      </div>

      <div className="text-xs text-neutral-500">
        Calendars checked: {atts.map((a) => `${a.calendar.replace(/^https:\/\//, "")} (${a.status})`).join(" · ") || "none"}
      </div>
    </main>
  );
}
