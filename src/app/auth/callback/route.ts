import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Exchanges the one-time code from an email link (password recovery, email
// confirmation, magic link) for a session, then forwards the user on. The
// PKCE verifier cookie set when the link was requested is present in the same
// browser, so exchangeCodeForSession can complete server-side.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";
  const base = `${url.origin}/chain`;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${base}${next}`);
  }
  return NextResponse.redirect(
    `${base}/login?error=${encodeURIComponent("Reset link is invalid or has expired.")}`
  );
}
