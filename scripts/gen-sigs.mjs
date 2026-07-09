import * as ed from "@noble/ed25519";
import { sha256, sha512 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
ed.hashes.sha512 = sha512;

const sortDeep = (v) =>
  Array.isArray(v) ? v.map(sortDeep)
  : v && typeof v === "object"
    ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortDeep(v[k])]))
    : v;
const recordHash = (p) => bytesToHex(sha256(new TextEncoder().encode(JSON.stringify(sortDeep(p)))));

async function signer(role, name) {
  const sk = ed.utils.randomSecretKey();
  const pk = bytesToHex(await ed.getPublicKeyAsync(sk));
  return { role, name, sk, pk };
}
async function sign(s, payload) {
  const sig = bytesToHex(await ed.signAsync(hexToBytes(recordHash(payload)), s.sk));
  return { role: s.role, name: s.name, pk: s.pk, sig };
}

// 8 records from the DB (id + payload + org + event_type)
const records = [
  ["a7e36888-cf7e-4d36-9c66-12ed53f17656","e398b4b4-1e03-4ec6-86fe-d38b00f37315","creation",{"waqf":{"name":"Home WaQF","type":"ahli","waqif":"M M","madhab":"other","shurut":[],"tenure":"perpetual","declaration_date":"1990-01-01"}}],
  ["1635194d-e5a5-46f4-81e0-4796ce225550","e398b4b4-1e03-4ec6-86fe-d38b00f37315","deed_registered",{"deed":{"note":"Deed document hash-registered in the deed vault","title":"Waqfiyyah of Home WaQF","registered_with":"Waqf-M Registry"}}],
  ["17c5e731-fe6f-4678-a7c4-07d83fa8dc3c","e398b4b4-1e03-4ec6-86fe-d38b00f37315","trustee_appointed",{"trustee":{"name":"Family Nazir","term":"2026-2031","basis":"founder shurut"}}],
  ["b3ea435f-1964-47d4-9fc2-ec07116a3107","e398b4b4-1e03-4ec6-86fe-d38b00f37315","annual_report",{"report":{"year":2025,"auditor":"Demo Audit LLP","corpus_intact":true,"income_distributed_pct":88}}],
  ["e6feb737-aa6e-4277-ae94-8a146ce2b1e5","abca8015-e71d-458c-a1e7-671c88634f36","creation",{"waqf":{"name":"M","type":"khayri","waqif":"M M","madhab":"hanafi","shurut":[],"tenure":"perpetual","declaration_date":"1998-01-01"}}],
  ["1878cc9c-fd91-4e4a-b77b-e39e9e6706ec","abca8015-e71d-458c-a1e7-671c88634f36","deed_registered",{"deed":{"note":"Deed document hash-registered in the deed vault","title":"Waqfiyyah of M","registered_with":"Waqf-M Registry"}}],
  ["2ac79b91-2f98-42ce-ab3f-ee50bc8203fc","abca8015-e71d-458c-a1e7-671c88634f36","trustee_appointed",{"trustee":{"name":"Nazir Council","term":"2026-2031","basis":"founder shurut"}}],
  ["9e0a0088-e926-4245-afa6-61b2605520ce","abca8015-e71d-458c-a1e7-671c88634f36","annual_report",{"report":{"year":2025,"auditor":"Demo Audit LLP","corpus_intact":true,"income_distributed_pct":92}}],
];

// one keypair per role, shared across both waqfs (a real registry would vary these)
const founder = await signer("founder", "Waqif (M M)");
const witness = await signer("witness", "Registry Witness");
const trustee = await signer("trustee", "Nazir Council");

const rows = [];
for (const [id, org, type, payload] of records) {
  const signers = type === "creation" ? [founder, witness] : [trustee];
  for (const s of signers) {
    const { role, name, pk, sig } = await sign(s, payload);
    rows.push(`('${id}','${org}','${role}','${name.replace(/'/g,"''")}','${pk}','${sig}','ed25519')`);
  }
}
console.log(
  "insert into record_signatures (record_id, org_id, signer_role, signer_name, public_key, signature, algorithm) values\n" +
  rows.join(",\n") + ";"
);
