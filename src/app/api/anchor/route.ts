import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST: merkle-batch all unbatched records. Requires a signed-in user.
// (External OpenTimestamps anchoring of the returned root comes next.)
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const { data, error } = await supabase.rpc("create_anchor_batch");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const batch = (data ?? [])[0];
  if (!batch) return NextResponse.json({ message: "no unbatched records" });
  return NextResponse.json(batch);
}
