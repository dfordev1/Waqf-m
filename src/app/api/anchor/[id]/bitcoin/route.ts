import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// Upgrades and verifies an anchor batch's OpenTimestamps proofs against the
// Bitcoin blockchain, using the official `opentimestamps` library. Returns the
// Bitcoin block height + time once the proof is confirmed, or "pending" while
// the calendar's commitment is still waiting for a Bitcoin block.
const MAGIC = Buffer.from([
  0x00, ...Buffer.from("OpenTimestamps"), 0x00, 0x00,
  ...Buffer.from("Proof"), 0x00,
  0xbf, 0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94,
]);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: batch } = await supabase
    .from("anchor_batches_public")
    .select("merkle_root, external_anchor")
    .eq("id", id)
    .single();
  if (!batch) return Response.json({ error: "batch not found" }, { status: 404 });

  const anchor = batch.external_anchor as
    | { calendars?: { calendar: string; ok: boolean; proof_base64?: string }[] }
    | null;
  const cals = (anchor?.calendars ?? []).filter((c) => c.ok && c.proof_base64);
  if (!cals.length)
    return Response.json({ error: "batch not yet anchored" }, { status: 409 });

  const OTS = (await import("opentimestamps")).default;
  const { Ops, Context, DetachedTimestampFile } = OTS;
  const digest = Buffer.from(batch.merkle_root, "hex");

  const attestations: Array<Record<string, unknown>> = [];
  for (const c of cals) {
    try {
      const ots = Buffer.concat([
        MAGIC, Buffer.from([0x01]), Buffer.from([0x08]),
        digest, Buffer.from(c.proof_base64!, "base64"),
      ]);
      const detached = DetachedTimestampFile.deserialize(
        new Context.StreamDeserialization(Uint8Array.from(ots))
      );
      const original = DetachedTimestampFile.fromHash(
        new Ops.OpSHA256(),
        Uint8Array.from(digest)
      );
      await OTS.upgrade(detached);
      const res = await OTS.verify(detached, original);
      const btc = res?.bitcoin;
      if (btc?.timestamp) {
        attestations.push({
          calendar: c.calendar,
          status: "confirmed",
          chain: "bitcoin",
          block_height: btc.height ?? null,
          block_time: new Date(btc.timestamp * 1000).toISOString(),
          block_explorer: btc.height
            ? `https://mempool.space/block-height/${btc.height}`
            : null,
        });
      } else {
        attestations.push({ calendar: c.calendar, status: "pending" });
      }
    } catch (e) {
      attestations.push({ calendar: c.calendar, status: "error", error: String(e).slice(0, 160) });
    }
  }

  const confirmed = attestations.find((a) => a.status === "confirmed");
  return Response.json({
    batch_id: id,
    merkle_root: batch.merkle_root,
    bitcoin_confirmed: !!confirmed,
    summary: confirmed
      ? `Committed to Bitcoin block ${confirmed.block_height} at ${confirmed.block_time}`
      : "Submitted to OpenTimestamps calendars; awaiting Bitcoin block (upgrades automatically).",
    attestations,
  });
}
