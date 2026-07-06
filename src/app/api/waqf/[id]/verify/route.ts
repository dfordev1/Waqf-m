import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordHash, verifyAllSignatures } from "@/lib/waqfcore/crypto";

// Re-verifies the full hash chain of a waqf, plus every Ed25519 signature
// attached to each record. Works for anonymous callers on public waqfs, and
// for org members on private ones — payload is read server-side only to
// recompute hashes and is never included in the response.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: chainRows, error } = await supabase.rpc("verify_waqf_chain", {
    p_waqf: id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const chain = (chainRows ?? []) as { seq: number; hash: string; valid: boolean }[];

  const { data: records } = await supabase.rpc("records_for_verification", {
    p_waqf: id,
  });
  const recs = records ?? [];

  const { data: sigs } = recs.length
    ? await supabase.rpc("signatures_for_verification", {
        p_record_ids: recs.map((r: { record_id: string }) => r.record_id),
      })
    : { data: [] };

  type SigRow = {
    record_id: string;
    signer_role: string;
    signer_name: string;
    public_key: string;
    signature: string;
    algorithm: string;
    signed_at: string;
  };
  const sigsByRecord = new Map<string, SigRow[]>();
  for (const s of (sigs ?? []) as SigRow[]) {
    const arr = sigsByRecord.get(s.record_id) ?? [];
    arr.push(s);
    sigsByRecord.set(s.record_id, arr);
  }

  const bySeq = new Map(chain.map((r) => [r.seq, r]));
  const detail = [];
  for (const rec of recs) {
    const recSigs = sigsByRecord.get(rec.record_id) ?? [];
    const verifiedSigs = await verifyAllSignatures(
      rec.payload,
      recSigs.map((s) => ({
        role: s.signer_role as import("@/lib/waqfcore/crypto").SignerRole,
        signer_name: s.signer_name,
        algorithm: "ed25519" as const,
        public_key: s.public_key,
        signature: s.signature,
        signed_at: s.signed_at,
      }))
    );
    const chainEntry = bySeq.get(rec.seq);
    detail.push({
      seq: rec.seq,
      event_type: rec.event_type,
      // chain_hash: tamper-evidence over the whole envelope (links to prev record)
      chain_hash: chainEntry?.hash,
      chain_valid: chainEntry?.valid ?? false,
      // signed_hash: hash of the payload alone — this is what signatures cover,
      // matching the Waqf Core protocol (waqf-core Python CLI signs the same way)
      signed_hash: recordHash(rec.payload),
      signatures: verifiedSigs,
    });
  }

  const chainValid = chain.length > 0 && chain.every((r) => r.valid);
  const allSignaturesValid = detail.every((d) =>
    d.signatures.every((s) => s.valid)
  );

  return NextResponse.json({
    waqf_id: id,
    records: chain.length,
    chain_valid: chainValid,
    all_signatures_valid: allSignaturesValid,
    head: chain.at(-1)?.hash ?? null,
    detail,
  });
}
