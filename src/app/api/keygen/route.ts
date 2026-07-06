import { NextResponse } from "next/server";
import { genKeypair } from "@/lib/waqfcore/crypto";
import { rateLimit, tooMany } from "@/lib/ratelimit";

// GET: mint a fresh Ed25519 keypair. The private key is returned once and
// never stored server-side — same trust model as the Python CLI's `waqf keygen`.
export async function GET(req: Request) {
  const rl = rateLimit(req, "keygen", 20);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const { sk, pk } = await genKeypair();
  return NextResponse.json({ private_key: sk, public_key: pk });
}
