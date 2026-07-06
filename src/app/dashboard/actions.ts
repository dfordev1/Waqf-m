"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createOrg(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("orgs").insert({
    name: String(formData.get("name")),
    jurisdiction: String(formData.get("jurisdiction") || "generic"),
  });
  if (error) redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard");
}

export async function createWaqf(formData: FormData) {
  const supabase = await createClient();
  const tenure = String(formData.get("tenure"));
  const { error } = await supabase.from("waqfs").insert({
    org_id: String(formData.get("org_id")),
    name: String(formData.get("name")),
    waqf_type: String(formData.get("waqf_type")),
    tenure,
    expires_on:
      tenure === "temporary" ? String(formData.get("expires_on")) : null,
    madhab: String(formData.get("madhab")),
    waqif_name: String(formData.get("waqif_name")),
    declaration_date: String(formData.get("declaration_date")) || null,
    is_public: formData.get("is_public") === "on",
  });
  if (error) redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard");
}
