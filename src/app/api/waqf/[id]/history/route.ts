import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Public proof tier: event history (hashes only) for a public waqf.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("waqf_records_public")
    .select("seq, event_type, prev_hash, hash, recorded_at")
    .eq("waqf_id", id)
    .order("seq");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ waqf_id: id, records: data });
}
