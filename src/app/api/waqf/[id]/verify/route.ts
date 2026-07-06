import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Re-verifies the full hash chain of a waqf server-side.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("verify_waqf_chain", {
    p_waqf: id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const records = (data ?? []) as { seq: number; hash: string; valid: boolean }[];
  return NextResponse.json({
    waqf_id: id,
    records: records.length,
    chain_valid: records.length > 0 && records.every((r) => r.valid),
    head: records.at(-1)?.hash ?? null,
    detail: records,
  });
}
