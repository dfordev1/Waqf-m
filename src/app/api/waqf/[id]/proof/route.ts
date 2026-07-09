import { createClient } from "@/lib/supabase/server";
import { merkleBranch, merkleRoot, rootFromBranch } from "@/lib/waqfcore/merkle";
import { rateLimit, tooMany } from "@/lib/ratelimit";

// Merkle-inclusion proofs: for each record of a public waqf, returns the branch
// that proves its chain hash sits under an anchored merkle root — which is in
// turn committed to Bitcoin via OpenTimestamps. An independent verifier can
// recompute root-from-branch and check that root against Bitcoin, proving any
// single record is timestamped on Bitcoin without trusting this server.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = rateLimit(req, "proof", 30);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const { id } = await params;
  const supabase = await createClient();

  const { data: recs, error } = await supabase.rpc("records_for_proof", { p_waqf: id });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  if (!recs?.length) return Response.json({ error: "no public records for this waqf" }, { status: 404 });

  // Cache leaves + batch anchor per batch_id
  const batchCache = new Map<
    string,
    { leaves: string[]; root: string; recomputedRoot: string; anchor: unknown; anchored: boolean }
  >();

  const records = [];
  for (const r of recs as {
    seq: number; event_type: string; chain_hash: string; prev_hash: string; batch_id: string | null;
  }[]) {
    if (!r.batch_id) {
      records.push({
        seq: r.seq, event_type: r.event_type, chain_hash: r.chain_hash, prev_hash: r.prev_hash,
        anchored: false, note: "not yet batched/anchored",
      });
      continue;
    }
    if (!batchCache.has(r.batch_id)) {
      const { data: leafRows } = await supabase.rpc("batch_leaves", { p_batch: r.batch_id });
      const leaves = (leafRows ?? []).map((x: { hash: string }) => x.hash);
      const { data: b } = await supabase
        .from("anchor_batches_public")
        .select("merkle_root, external_anchor")
        .eq("id", r.batch_id)
        .single();
      batchCache.set(r.batch_id, {
        leaves,
        root: b?.merkle_root ?? "",
        recomputedRoot: leaves.length ? merkleRoot(leaves) : "",
        anchor: b?.external_anchor ?? null,
        anchored: !!b?.external_anchor,
      });
    }
    const bc = batchCache.get(r.batch_id)!;
    const idx = bc.leaves.indexOf(r.chain_hash);
    const branch = idx >= 0 ? merkleBranch(bc.leaves, idx) : [];
    const rebuilt = idx >= 0 ? rootFromBranch(r.chain_hash, branch) : "";
    records.push({
      seq: r.seq,
      event_type: r.event_type,
      chain_hash: r.chain_hash,
      prev_hash: r.prev_hash,
      batch_id: r.batch_id,
      merkle_root: bc.root,
      merkle_branch: branch,
      inclusion_valid: rebuilt === bc.root && bc.root !== "",
      anchored: bc.anchored,
    });
  }

  // Distinct batches with their OTS anchor, so the verifier can check Bitcoin
  const batches = [...batchCache.entries()].map(([bid, b]) => ({
    batch_id: bid,
    merkle_root: b.root,
    root_recompute_ok: b.recomputedRoot === b.root,
    anchored: b.anchored,
    opentimestamps: b.anchor,
    ots_download: `/chain/api/anchor/${bid}/ots`,
    bitcoin_verify: `/chain/api/anchor/${bid}/bitcoin`,
  }));

  return Response.json({
    waqf_id: id,
    record_count: records.length,
    how_to_verify:
      "For each record, recompute root from chain_hash + merkle_branch and confirm it equals merkle_root; then verify that merkle_root against Bitcoin via the batch's .ots proof. Independent CLI: npx (see scripts/waqf-verify.mjs).",
    records,
    batches,
  });
}
