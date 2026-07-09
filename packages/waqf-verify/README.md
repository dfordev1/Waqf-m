# waqf-verify

Independently verify any [Waqf-M](https://waqf.im/chain) waqf — end to end, trusting nothing the server says.

```bash
npx waqf-verify <waqf-id>
# e.g.
npx waqf-verify c7ab7f0e-8880-42fd-af9a-965fd1c3bdba
```

It fetches only hashes from the public API, then runs every cryptographic check **on your machine**:

1. **Chain linkage** — each record's `prev_hash` equals the previous record's hash (an unbroken, tamper-evident chain).
2. **Merkle inclusion** — each record's hash + its Merkle branch recomputes to the batch's anchored root.
3. **Bitcoin anchoring** — that root is confirmed in a Bitcoin block, checked against the real chain via the official [OpenTimestamps](https://opentimestamps.org) library.
4. **Signatures & chain** — cross-checks the registry's own verify endpoint (Ed25519 signatures, chain hashes).

Exit code `0` = `VERIFIED`, `1` = failed. Point it at any deployment:

```bash
npx waqf-verify <waqf-id> --base=https://waqf.im/chain
```

## Why this exists

A public waqf registry is only trustworthy if outsiders can audit it without trusting the operator. This tool is that audit: the Merkle branch and Bitcoin proof are verified locally, so the only things you trust are mathematics and the Bitcoin blockchain — not us.

Requires Node 18+. MIT licensed. Source: [github.com/dfordev1/Waqf-m](https://github.com/dfordev1/Waqf-m).
