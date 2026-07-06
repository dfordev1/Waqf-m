import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { submitDigestToCalendars } from "@/lib/waqfcore/opentimestamps";

// POST: submit an anchor batch's merkle root to public OpenTimestamps
// calendar servers, storing their pending attestations. This is what makes
// a batch's root independently, externally witnessed — the "Bitcoin anchor"
// leg of the protocol (see docs/bitcoin-anchor.md in the waqf-core prototype).
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const { data: batch, error: fetchErr } = await supabase
    .from("anchor_batches_public")
    .select("id, merkle_root, external_anchor")
    .eq("id", id)
    .single();
  if (fetchErr || !batch)
    return NextResponse.json({ error: "batch not found" }, { status: 404 });
  if (batch.external_anchor)
    return NextResponse.json({ error: "batch already anchored" }, { status: 409 });

  const attestations = await submitDigestToCalendars(batch.merkle_root);
  const ok = attestations.filter((a) => a.ok);
  if (ok.length === 0)
    return NextResponse.json(
      { error: "no calendar server accepted the digest", attestations },
      { status: 502 }
    );

  const { error: rpcErr } = await supabase.rpc("attach_external_anchor", {
    p_batch: id,
    p_anchor: {
      type: "opentimestamps",
      submitted_at: new Date().toISOString(),
      calendars: attestations,
    },
  });
  if (rpcErr) return NextResponse.json({ error: rpcErr.message }, { status: 400 });

  return NextResponse.json({
    batch_id: id,
    merkle_root: batch.merkle_root,
    calendars_accepted: ok.length,
    calendars_total: attestations.length,
  });
}
