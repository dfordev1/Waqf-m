import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

// Merkle tree identical to create_anchor_batch() in SQL: pairwise sha256 over
// raw 32-byte leaves, duplicating the last leaf when a level has odd length.

export interface BranchStep {
  hash: string; // sibling hash (hex)
  position: "left" | "right"; // which side the sibling sits on
}

function pair(a: Uint8Array, b: Uint8Array): Uint8Array {
  const buf = new Uint8Array(a.length + b.length);
  buf.set(a, 0);
  buf.set(b, a.length);
  return Uint8Array.from(sha256(buf));
}
const toBytes = (h: string): Uint8Array => Uint8Array.from(hexToBytes(h));

/** Merkle root of hex leaves (matches SQL create_anchor_batch). */
export function merkleRoot(leavesHex: string[]): string {
  if (!leavesHex.length) throw new Error("no leaves");
  let level: Uint8Array[] = leavesHex.map(toBytes);
  while (level.length > 1) {
    if (level.length % 2 === 1) level.push(level[level.length - 1]);
    const next: Uint8Array[] = [];
    for (let i = 0; i < level.length; i += 2) next.push(pair(level[i], level[i + 1]));
    level = next;
  }
  return bytesToHex(level[0]);
}

/** Inclusion branch for the leaf at `index`, bottom-up. */
export function merkleBranch(leavesHex: string[], index: number): BranchStep[] {
  if (index < 0 || index >= leavesHex.length) throw new Error("index out of range");
  let level: Uint8Array[] = leavesHex.map(toBytes);
  let idx = index;
  const branch: BranchStep[] = [];
  while (level.length > 1) {
    if (level.length % 2 === 1) level.push(level[level.length - 1]);
    const isRightSibling = idx % 2 === 0; // even idx → sibling to the right
    const sibIdx = isRightSibling ? idx + 1 : idx - 1;
    branch.push({
      hash: bytesToHex(level[sibIdx]),
      position: isRightSibling ? "right" : "left",
    });
    const next: Uint8Array[] = [];
    for (let i = 0; i < level.length; i += 2) next.push(pair(level[i], level[i + 1]));
    level = next;
    idx = Math.floor(idx / 2);
  }
  return branch;
}

/** Recompute a root from a leaf + branch (what an independent verifier runs). */
export function rootFromBranch(leafHex: string, branch: BranchStep[]): string {
  let h: Uint8Array = toBytes(leafHex);
  for (const step of branch) {
    const sib = toBytes(step.hash);
    h = step.position === "right" ? pair(h, sib) : pair(sib, h);
  }
  return bytesToHex(h);
}
