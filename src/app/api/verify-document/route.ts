import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, tooMany } from "@/lib/ratelimit";

// POST { sha256: "<hex>" } — checks whether a document matches a registered deed.
export async function POST(req: Request) {
  const rl = rateLimit(req, "verify-document", 30);
  if (!rl.ok) return tooMany(rl.retryAfter);
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
