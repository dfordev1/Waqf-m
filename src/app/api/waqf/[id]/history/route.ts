import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, tooMany } from "@/lib/ratelimit";

// Public proof tier: event history (hashes only) for a public waqf.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = rateLimit(req, "history", 60);
  if (!rl.ok) return tooMany(rl.retryAfter);
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
