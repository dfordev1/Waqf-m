"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function upsertProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("scholar_profiles").upsert({
    user_id: user.id,
    display_name: String(formData.get("display_name")).slice(0, 120),
    affiliation: String(formData.get("affiliation") || "").slice(0, 200) || null,
    field: String(formData.get("field") || "").slice(0, 120) || null,
    paper_url: String(formData.get("paper_url") || "").slice(0, 300) || null,
    bio: String(formData.get("bio") || "").slice(0, 600) || null,
  });
  if (error) redirect(`/circle?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/circle");
}

export async function createPost(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const body = String(formData.get("body") || "").trim();
  if (!body) redirect(`/circle?error=${encodeURIComponent("Write something first.")}`);

  const { error } = await supabase.from("circle_posts").insert({ author: user.id, body });
  if (error) redirect(`/circle?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/circle");
}

export async function sendMessage(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const recipient = String(formData.get("recipient"));
  const body = String(formData.get("body") || "").trim();
  if (!body) redirect(`/circle/dm/${recipient}?error=${encodeURIComponent("Write a message first.")}`);

  const { error } = await supabase
    .from("circle_messages")
    .insert({ sender: user.id, recipient, body });
  if (error) redirect(`/circle/dm/${recipient}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/circle/dm/${recipient}`);
}
