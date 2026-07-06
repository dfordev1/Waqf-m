import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST { sha256: "<hex>" } — checks whether a document matches a registered deed.
export async function POST(req: Request) {
  const { sha256 } = await req.json().catch(() => ({}));
  if (!/^[0-9a-fA-F]{64}$/.test(sha256 ?? ""))
    return NextResponse.json(
      { error: "Provide sha256: 64-char hex hash of the document" },
      { status: 400 }
    );
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("verify_document", {
    p_sha256: sha256.toLowerCase(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const matches = data ?? [];
  return NextResponse.json({ verified: matches.length > 0, matches });
}
