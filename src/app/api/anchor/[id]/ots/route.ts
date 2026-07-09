import { createClient } from "@/lib/supabase/server";

// Exports a standard detached .ots proof file for an anchor batch, so anyone
// can verify it independently with the official `ots verify` CLI or the
// opentimestamps.org web verifier — no trust in this app required.
//   .ots = MAGIC + version + OpSHA256 tag + 32-byte merkle root + calendar proof
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
  const cal = anchor?.calendars?.find((c) => c.ok && c.proof_base64);
  if (!cal?.proof_base64)
    return Response.json({ error: "batch not yet anchored" }, { status: 409 });

  const ots = Buffer.concat([
    MAGIC,
    Buffer.from([0x01]), // major version
    Buffer.from([0x08]), // OpSHA256 op tag
    Buffer.from(batch.merkle_root, "hex"),
    Buffer.from(cal.proof_base64, "base64"),
  ]);

  return new Response(new Uint8Array(ots), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="waqf-batch-${id}.ots"`,
    },
  });
}
