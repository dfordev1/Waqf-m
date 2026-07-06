// Waqf Core protocol crypto: Ed25519 keypairs + signatures over a record's
// canonical hash. Mirrors cli/waqfcore.py exactly (same canonical-JSON rules,
// same hex sha256, same ed25519 signing over the hash bytes) so a signature
// made by either implementation verifies in the other.
import * as ed from "@noble/ed25519";
import { sha256, sha512 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

// @noble/ed25519 v3 needs an explicit sha512 wired in for its internal hashing.
ed.hashes.sha512 = sha512;

export type SignerRole =
  | "founder"
  | "witness"
  | "trustee"
  | "court"
  | "auditor"
  | "regulator";

export interface Signature {
  role: SignerRole;
  signer_name: string;
  algorithm: "ed25519";
  public_key: string; // hex
  signature: string; // hex
  signed_at: string; // ISO
}

/** RFC 8785-ish JCS subset: sorted keys, no whitespace. Matches
 * json.dumps(obj, sort_keys=True, separators=(",",":")) used in Python. */
export function canonicalize(obj: unknown): string {
  return JSON.stringify(sortDeep(obj));
}

function sortDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      out[k] = sortDeep((v as Record<string, unknown>)[k]);
    }
    return out;
  }
  return v;
}

/** SHA-256 (hex) of the canonical `record` payload — the record's identity. */
export function recordHash(record: unknown): string {
  const bytes = new TextEncoder().encode(canonicalize(record));
  return bytesToHex(sha256(bytes));
}

export async function genKeypair(): Promise<{ sk: string; pk: string }> {
  const sk = ed.utils.randomSecretKey();
  const pk = await ed.getPublicKeyAsync(sk);
  return { sk: bytesToHex(sk), pk: bytesToHex(pk) };
}

export async function signRecord(
  record: unknown,
  skHex: string,
  role: SignerRole,
  signerName = ""
): Promise<Signature> {
  const h = hexToBytes(recordHash(record));
  const sk = hexToBytes(skHex);
  const sig = await ed.signAsync(h, sk);
  const pk = await ed.getPublicKeyAsync(sk);
  return {
    role,
    signer_name: signerName,
    algorithm: "ed25519",
    public_key: bytesToHex(pk),
    signature: bytesToHex(sig),
    signed_at: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
  };
}

export async function verifySignature(
  record: unknown,
  sig: Signature
): Promise<boolean> {
  try {
    const h = hexToBytes(recordHash(record));
    return await ed.verifyAsync(
      hexToBytes(sig.signature),
      h,
      hexToBytes(sig.public_key)
    );
  } catch {
    return false;
  }
}

export async function verifyAllSignatures(
  record: unknown,
  signatures: Signature[]
): Promise<Array<Signature & { valid: boolean }>> {
  const out: Array<Signature & { valid: boolean }> = [];
  for (const s of signatures) {
    out.push({ ...s, valid: await verifySignature(record, s) });
  }
  return out;
}

// ---------- Merkle batching (identical algorithm to Python merkle_root) ----------
function pairHash(a: Uint8Array, b: Uint8Array): Uint8Array {
  const buf = new Uint8Array(a.length + b.length);
  buf.set(a, 0);
  buf.set(b, a.length);
  return sha256(buf);
}

export function merkleRoot(leafHex: string[]): string {
  if (leafHex.length === 0) throw new Error("no leaves");
  let level: Uint8Array[] = leafHex.map(hexToBytes);
  while (level.length > 1) {
    if (level.length % 2 === 1) level.push(level[level.length - 1]);
    const next: Uint8Array[] = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(pairHash(level[i], level[i + 1]));
    }
    level = next;
  }
  return bytesToHex(level[0]);
}
