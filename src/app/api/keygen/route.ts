import { NextResponse } from "next/server";
import { genKeypair } from "@/lib/waqfcore/crypto";

// GET: mint a fresh Ed25519 keypair. The private key is returned once and
// never stored server-side — same trust model as the Python CLI's `waqf keygen`.
export async function GET() {
  const { sk, pk } = await genKeypair();
  return NextResponse.json({ private_key: sk, public_key: pk });
}
