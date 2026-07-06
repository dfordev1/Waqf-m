"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function ctx(formData: FormData) {
  return {
    org_id: String(formData.get("org_id")),
    waqf_id: String(formData.get("waqf_id")),
  };
}

function fail(waqfId: string, message: string): never {
  redirect(`/dashboard/waqf/${waqfId}?error=${encodeURIComponent(message)}`);
}

async function done(waqfId: string) {
  revalidatePath(`/dashboard/waqf/${waqfId}`);
}

export async function saveAssetBoundary(
  assetId: string,
  waqfId: string,
  points: [number, number][]
) {
  const supabase = await createClient();
  // GeoJSON ring must close (first point == last); lng/lat order.
  const ring = points.map(([lat, lng]) => [lng, lat]);
  ring.push(ring[0]);
  const geojson = { type: "Polygon", coordinates: [ring] };
  const { error } = await supabase.rpc("set_asset_boundary", {
    p_asset: assetId,
    p_geojson: geojson,
  });
  // called imperatively from a client component — throw so the caller's
  // catch can show the message inline instead of redirecting
  if (error) throw new Error(error.message);
  await done(waqfId);
}

export async function addAsset(formData: FormData) {
  const { org_id, waqf_id } = ctx(formData);
  const supabase = await createClient();
  const { error } = await supabase.from("assets").insert({
    org_id,
    waqf_id,
    name: String(formData.get("name")),
    kind: String(formData.get("kind")),
    address: String(formData.get("address")) || null,
    area_sqm: Number(formData.get("area_sqm")) || null,
    current_valuation: Number(formData.get("current_valuation")) || null,
    title_reference: String(formData.get("title_reference")) || null,
  });
  if (error) fail(waqf_id, error.message);
  await done(waqf_id);
}

export async function addLease(formData: FormData) {
  const { org_id, waqf_id } = ctx(formData);
  const supabase = await createClient();
  const { error } = await supabase.from("leases").insert({
    org_id,
    waqf_id,
    asset_id: String(formData.get("asset_id")),
    tenant_name: String(formData.get("tenant_name")),
    tenant_contact: String(formData.get("tenant_contact")) || null,
    status: String(formData.get("status")),
    starts_on: String(formData.get("starts_on")),
    ends_on: String(formData.get("ends_on")),
    rent_amount: Number(formData.get("rent_amount")),
    rent_currency: String(formData.get("currency") || "USD"),
    frequency: String(formData.get("frequency")),
    market_rent_benchmark: Number(formData.get("market_rent_benchmark")) || null,
  });
  if (error) fail(waqf_id, error.message);
  await done(waqf_id);
}

export async function addCase(formData: FormData) {
  const { org_id, waqf_id } = ctx(formData);
  const supabase = await createClient();
  const { error } = await supabase.from("cases").insert({
    org_id,
    waqf_id,
    asset_id: String(formData.get("asset_id")) || null,
    kind: String(formData.get("kind")),
    title: String(formData.get("title")),
    case_number: String(formData.get("case_number")) || null,
    court: String(formData.get("court")) || null,
    counsel: String(formData.get("counsel")) || null,
    filed_on: String(formData.get("filed_on")) || null,
    limitation_deadline: String(formData.get("limitation_deadline")) || null,
  });
  if (error) fail(waqf_id, error.message);
  await done(waqf_id);
}

export async function addBeneficiary(formData: FormData) {
  const { org_id, waqf_id } = ctx(formData);
  const supabase = await createClient();
  const { error } = await supabase.from("beneficiaries").insert({
    org_id,
    waqf_id,
    kind: String(formData.get("kind")),
    name: String(formData.get("name")),
    share_pct: Number(formData.get("share_pct")) || null,
    is_fallback: formData.get("is_fallback") === "on",
  });
  if (error) fail(waqf_id, error.message);
  await done(waqf_id);
}

export async function addDistribution(formData: FormData) {
  const { org_id, waqf_id } = ctx(formData);
  const supabase = await createClient();
  const { error } = await supabase.from("distributions").insert({
    org_id,
    waqf_id,
    beneficiary_id: String(formData.get("beneficiary_id")),
    amount: Number(formData.get("amount")),
    currency: String(formData.get("currency") || "USD"),
    memo: String(formData.get("memo")) || null,
  });
  if (error) fail(waqf_id, error.message);
  await done(waqf_id);
}

export async function addCampaign(formData: FormData) {
  const { org_id, waqf_id } = ctx(formData);
  const supabase = await createClient();
  const { error } = await supabase.from("campaigns").insert({
    org_id,
    waqf_id,
    title: String(formData.get("title")),
    status: String(formData.get("status")),
    goal_amount: Number(formData.get("goal_amount")) || null,
    currency: String(formData.get("currency") || "USD"),
  });
  if (error) fail(waqf_id, error.message);
  await done(waqf_id);
}

export async function recordDonation(formData: FormData) {
  const { org_id, waqf_id } = ctx(formData);
  const supabase = await createClient();
  const { error } = await supabase.from("donations").insert({
    org_id,
    waqf_id,
    campaign_id: String(formData.get("campaign_id")),
    donor_name: String(formData.get("donor_name")) || null,
    amount: Number(formData.get("amount")),
    currency: String(formData.get("currency") || "USD"),
    status: "received",
  });
  if (error) fail(waqf_id, error.message);
  await done(waqf_id);
}

export async function addInvestment(formData: FormData) {
  const { org_id, waqf_id } = ctx(formData);
  const supabase = await createClient();
  const { error } = await supabase.from("investments").insert({
    org_id,
    waqf_id,
    kind: String(formData.get("kind")),
    status: String(formData.get("status")),
    name: String(formData.get("name")),
    principal: Number(formData.get("principal")),
    currency: String(formData.get("currency") || "USD"),
    expected_yield_pct: Number(formData.get("expected_yield_pct")) || null,
    shariah_screened: formData.get("shariah_screened") === "on",
  });
  if (error) fail(waqf_id, error.message);
  await done(waqf_id);
}

export async function addDevProject(formData: FormData) {
  const { org_id, waqf_id } = ctx(formData);
  const supabase = await createClient();
  const { error } = await supabase.from("dev_projects").insert({
    org_id,
    waqf_id,
    asset_id: String(formData.get("asset_id")),
    title: String(formData.get("title")),
    phase: String(formData.get("phase")),
    budget: Number(formData.get("budget")) || null,
    financing_model: String(formData.get("financing_model")) || null,
    expected_annual_income: Number(formData.get("expected_annual_income")) || null,
  });
  if (error) fail(waqf_id, error.message);
  await done(waqf_id);
}

export async function addRentInvoice(formData: FormData) {
  const { org_id, waqf_id } = ctx(formData);
  const supabase = await createClient();
  const { error } = await supabase.from("rent_invoices").insert({
    org_id,
    lease_id: String(formData.get("lease_id")),
    due_on: String(formData.get("due_on")),
    amount: Number(formData.get("amount")),
    currency: String(formData.get("currency") || "USD"),
  });
  if (error) fail(waqf_id, error.message);
  await done(waqf_id);
}

export async function markInvoicePaid(formData: FormData) {
  const { waqf_id } = ctx(formData);
  const supabase = await createClient();
  const { error } = await supabase
    .from("rent_invoices")
    .update({ paid_at: new Date().toISOString(), payment_ref: String(formData.get("payment_ref")) || null })
    .eq("id", String(formData.get("invoice_id")));
  if (error) fail(waqf_id, error.message);
  await done(waqf_id);
}

export async function addHearing(formData: FormData) {
  const { org_id, waqf_id } = ctx(formData);
  const supabase = await createClient();
  const { error } = await supabase.from("hearings").insert({
    org_id,
    case_id: String(formData.get("case_id")),
    hearing_on: String(formData.get("hearing_on")),
    outcome: String(formData.get("outcome")) || null,
  });
  if (error) fail(waqf_id, error.message);
  await done(waqf_id);
}

export async function updateCaseStatus(formData: FormData) {
  const { waqf_id } = ctx(formData);
  const supabase = await createClient();
  const { error } = await supabase
    .from("cases")
    .update({ status: String(formData.get("status")) })
    .eq("id", String(formData.get("case_id")));
  if (error) fail(waqf_id, error.message);
  await done(waqf_id);
}

export async function addJournalEntry(formData: FormData) {
  const { org_id, waqf_id } = ctx(formData);
  const supabase = await createClient();
  const debitFundKind = String(formData.get("debit_fund"));
  const debitAccount = String(formData.get("debit_account"));
  const creditFundKind = String(formData.get("credit_fund"));
  const creditAccount = String(formData.get("credit_account"));
  const amount = Number(formData.get("amount"));
  const memo = String(formData.get("memo"));
  const nonCompliant = formData.get("non_compliant") === "on";

  const { data: entry, error: entryErr } = await supabase
    .from("journal_entries")
    .insert({ org_id, waqf_id, memo, non_compliant: nonCompliant })
    .select()
    .single();
  if (entryErr || !entry) fail(waqf_id, entryErr?.message ?? "could not create entry");

  const { data: funds, error: fundsErr } = await supabase
    .from("funds")
    .select("id, kind")
    .eq("waqf_id", waqf_id);
  if (fundsErr || !funds) fail(waqf_id, fundsErr?.message ?? "funds not found");
  const fundId = (kind: string) => funds.find((f) => f.kind === kind)!.id;

  // Debit (+amount) and credit (-amount) always net to zero — the balanced-
  // entry constraint (deferred to commit) is satisfied by construction.
  const { error: linesErr } = await supabase.from("journal_lines").insert([
    { org_id, entry_id: entry.id, fund_id: fundId(debitFundKind), account: debitAccount, amount },
    { org_id, entry_id: entry.id, fund_id: fundId(creditFundKind), account: creditAccount, amount: -amount },
  ]);
  if (linesErr) fail(waqf_id, linesErr.message);
  await done(waqf_id);
}
