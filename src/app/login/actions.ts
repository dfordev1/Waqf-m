"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// Compute the app's public origin from request headers so the reset link
// points back to whatever host the user is on (waqf-m.vercel.app or waqf.im),
// including the /chain basePath.
async function chainOrigin() {
  const h = await headers();
  const host = h.get("host") ?? "waqf-m.vercel.app";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}/chain`;
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email"));
  if (!email) redirect(`/forgot-password?error=${encodeURIComponent("Enter your email.")}`);
  const supabase = await createClient();
  const origin = await chainOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });
  if (error) redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`);
  // Always report success (don't reveal whether an email is registered).
  redirect(
    `/login?message=${encodeURIComponent(
      "If that email has an account, a password reset link is on its way."
    )}`
  );
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password"));
  if (password.length < 8)
    redirect(`/reset-password?error=${encodeURIComponent("Password must be at least 8 characters.")}`);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    redirect(
      `/login?error=${encodeURIComponent("Reset link expired or invalid. Request a new one.")}`
    );
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  await supabase.auth.signOut();
  redirect(`/login?message=${encodeURIComponent("Password updated. Please sign in.")}`);
}
