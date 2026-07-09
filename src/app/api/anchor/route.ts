import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST: merkle-batch all unbatched records. Batching is registry-wide (it
// spans orgs), so it's restricted to org owners — not any signed-in user.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const { data: ownerRows } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .limit(1);
  if (!ownerRows?.length)
    return NextResponse.json(
      { error: "batching is restricted to organization owners" },
      { status: 403 }
    );

  const { data, error } = await supabase.rpc("create_anchor_batch");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const batch = (data ?? [])[0];
  if (!batch) return NextResponse.json({ message: "no unbatched records" });
  return NextResponse.json(batch);
}
