import { describe, it, expect } from "vitest";
import {
  canonicalize,
  recordHash,
  genKeypair,
  signRecord,
  verifySignature,
  verifyAllSignatures,
  merkleRoot,
} from "./crypto";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

// Golden vector cross-checked against the Python reference implementation
// (cli/waqfcore.py): json.dumps(record, sort_keys=True, separators=(",",":"))
// hashed with sha256 produced exactly this hex. If canonicalization drifts
// from the Python implementation, this test fails.
const GOLDEN_RECORD = {
  id: "waqf:test:1",
  founder: { name: "X" },
  asset: { kind: "land" },
  purpose: "p",
  beneficiaries: [],
  trustee: { name: "Y" },
  jurisdiction: { country: "IN" },
  created_at: "2026-01-01T00:00:00Z",
};
const GOLDEN_HASH =
  "acb096121c80fa34b6c6f5eb57db6d8057b605c064272be38ed3ae90f4c6af3a";

describe("canonicalize", () => {
  it("sorts keys deeply and emits no whitespace", () => {
    expect(canonicalize({ b: 1, a: { d: 2, c: 3 } })).toBe(
      '{"a":{"c":3,"d":2},"b":1}'
    );
  });

  it("preserves array order but sorts keys inside array elements", () => {
    expect(canonicalize({ arr: [{ z: 1, a: 2 }, 3] })).toBe(
      '{"arr":[{"a":2,"z":1},3]}'
    );
  });
});

describe("recordHash", () => {
  it("matches the Python reference implementation (golden vector)", () => {
    expect(recordHash(GOLDEN_RECORD)).toBe(GOLDEN_HASH);
  });

  it("is insensitive to key order", () => {
    const shuffled = {
      created_at: "2026-01-01T00:00:00Z",
      jurisdiction: { country: "IN" },
      trustee: { name: "Y" },
      beneficiaries: [],
      purpose: "p",
      asset: { kind: "land" },
      founder: { name: "X" },
      id: "waqf:test:1",
    };
    expect(recordHash(shuffled)).toBe(GOLDEN_HASH);
  });

  it("changes when any field changes", () => {
    expect(recordHash({ ...GOLDEN_RECORD, purpose: "q" })).not.toBe(
      GOLDEN_HASH
    );
  });
});

describe("ed25519 signatures", () => {
  it("round-trips sign → verify", async () => {
    const { sk } = await genKeypair();
    const sig = await signRecord(GOLDEN_RECORD, sk, "trustee", "T");
    expect(sig.algorithm).toBe("ed25519");
    expect(await verifySignature(GOLDEN_RECORD, sig)).toBe(true);
  });

  it("rejects a signature over different content", async () => {
    const { sk } = await genKeypair();
    const sig = await signRecord(GOLDEN_RECORD, sk, "trustee");
    expect(await verifySignature({ ...GOLDEN_RECORD, purpose: "q" }, sig)).toBe(
      false
    );
  });

  it("rejects a tampered signature", async () => {
    const { sk } = await genKeypair();
    const sig = await signRecord(GOLDEN_RECORD, sk, "founder");
    const tampered = {
      ...sig,
      signature: sig.signature.replace(/^../, sig.signature.startsWith("00") ? "11" : "00"),
    };
    expect(await verifySignature(GOLDEN_RECORD, tampered)).toBe(false);
  });

  it("verifyAllSignatures reports per-signature validity", async () => {
    const a = await genKeypair();
    const b = await genKeypair();
    const good = await signRecord(GOLDEN_RECORD, a.sk, "trustee");
    const bad = {
      ...(await signRecord(GOLDEN_RECORD, b.sk, "auditor")),
      public_key: a.pk, // wrong key for this signature
    };
    const results = await verifyAllSignatures(GOLDEN_RECORD, [good, bad]);
    expect(results.map((r) => r.valid)).toEqual([true, false]);
  });

  it("handles malformed signature material without throwing", async () => {
    expect(
      await verifySignature(GOLDEN_RECORD, {
        role: "court",
        signer_name: "",
        algorithm: "ed25519",
        public_key: "zz-not-hex",
        signature: "also-not-hex",
        signed_at: "",
      })
    ).toBe(false);
  });
});

describe("merkleRoot", () => {
  const leaf = (s: string) =>
    bytesToHex(sha256(new TextEncoder().encode(s)));

  it("root of a single leaf is the leaf", () => {
    const l = leaf("a");
    expect(merkleRoot([l])).toBe(l);
  });

  it("root of two leaves is sha256(l1||l2)", () => {
    const l1 = leaf("a");
    const l2 = leaf("b");
    const expected = bytesToHex(
      sha256(new Uint8Array([...hexToBytes(l1), ...hexToBytes(l2)]))
    );
    expect(merkleRoot([l1, l2])).toBe(expected);
  });

  it("duplicates the odd leaf (3 leaves)", () => {
    const [l1, l2, l3] = [leaf("a"), leaf("b"), leaf("c")];
    // level1: h(l1||l2), h(l3||l3); root: h(of those two)
    const pair = (x: string, y: string) =>
      bytesToHex(sha256(new Uint8Array([...hexToBytes(x), ...hexToBytes(y)])));
    expect(merkleRoot([l1, l2, l3])).toBe(pair(pair(l1, l2), pair(l3, l3)));
  });

  it("throws on empty input", () => {
    expect(() => merkleRoot([])).toThrow();
  });
});
