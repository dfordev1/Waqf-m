import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Handles every email-link variant Supabase can send:
//  - PKCE code flow:   ?code=...
//  - OTP/token_hash:   ?token_hash=...&type=recovery|signup|magiclink|email
//  - error redirects:  ?error=...&error_description=...
// then forwards the user into the app (under the /chain basePath).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const p = url.searchParams;
  const base = `${url.origin}/chain`;
  const next = p.get("next") ?? "/dashboard";

  const err = p.get("error_description") || p.get("error");
  if (err) {
    return NextResponse.redirect(`${base}/login?error=${encodeURIComponent(err)}`);
  }

  const supabase = await createClient();

  const code = p.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${base}${next}`);
    return NextResponse.redirect(`${base}/login?error=${encodeURIComponent(error.message)}`);
  }

  const token_hash = p.get("token_hash");
  const type = p.get("type") as EmailOtpType | null;
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) return NextResponse.redirect(`${base}${next}`);
    return NextResponse.redirect(`${base}/login?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(
    `${base}/login?error=${encodeURIComponent("Reset link is invalid or has expired. Request a new one.")}`
  );
}
