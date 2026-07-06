import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

// POST multipart/form-data: file, org_id, title, language, executed_on
// Uploads the document to private storage and registers a `deeds` row with
// its SHA-256 — the hash /api/verify-document checks incoming PDFs against.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: waqfId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const orgId = String(form.get("org_id") ?? "");
  const title = String(form.get("title") ?? "");
  if (!(file instanceof File) || !orgId || !title)
    return NextResponse.json({ error: "file, org_id, title are required" }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const digest = bytesToHex(sha256(bytes));
  const path = `${orgId}/${crypto.randomUUID()}-${file.name}`;

  const { error: upErr } = await supabase.storage
    .from("deeds")
    .upload(path, bytes, { contentType: file.type || "application/octet-stream" });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

  const { data: deed, error: dbErr } = await supabase
    .from("deeds")
    .insert({
      org_id: orgId,
      waqf_id: waqfId,
      title,
      storage_path: path,
      language: String(form.get("language") ?? "") || null,
      executed_on: String(form.get("executed_on") ?? "") || null,
      content_sha256: digest,
    })
    .select()
    .single();
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 400 });

  return NextResponse.json({ deed, sha256: digest });
}
