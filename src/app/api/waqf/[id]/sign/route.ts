import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signRecord, type SignerRole } from "@/lib/waqfcore/crypto";
import { rateLimit, tooMany } from "@/lib/ratelimit";

// POST { seq, sk, role, signer_name } — signs a specific chained record's
// canonical payload with an Ed25519 private key and stores the signature.
// The signed payload is exactly the same `record.payload` the chain hashed,
// so this signature is independently verifiable by the Python waqf-core CLI
// or any other Waqf Core implementation, not just this app.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = rateLimit(req, "sign", 15);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const { id } = await params;
  const { seq, sk, role, signer_name } = await req.json().catch(() => ({}));
  if (!seq || !sk || !role)
    return NextResponse.json(
      { error: "Provide seq, sk (private key hex), role" },
      { status: 400 }
    );

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const { data: record, error: recErr } = await supabase
    .from("waqf_records")
    .select("id, org_id, waqf_id, payload")
    .eq("waqf_id", id)
    .eq("seq", seq)
    .single();
  if (recErr || !record)
    return NextResponse.json({ error: "record not found" }, { status: 404 });

  const sig = await signRecord(record.payload, sk, role as SignerRole, signer_name ?? "");

  const { error } = await supabase.from("record_signatures").insert({
    record_id: record.id,
    org_id: record.org_id,
    signer_role: sig.role,
    signer_name: sig.signer_name,
    public_key: sig.public_key,
    signature: sig.signature,
    algorithm: sig.algorithm,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ record_id: record.id, seq, signature: sig });
}
