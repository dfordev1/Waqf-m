// Minimal OpenTimestamps calendar client: submits a SHA-256 digest to public
// OTS calendar servers and stores their pending-attestation response. This is
// the same network protocol the official `ots stamp` CLI uses under the hood
// (POST raw digest bytes to <calendar>/digest), reimplemented directly because
// the reference Python client depends on OpenSSL bindings that don't build
// cleanly on Windows. Full local Bitcoin-block verification of the resulting
// proof is future work — see docs/bitcoin-anchor.md for the roadmap; today
// this proves an independent calendar witnessed the hash at this time, which
// upgrades to a Bitcoin-confirmed proof automatically as the calendar matures
// (the official `ots upgrade`/`ots verify` tools can consume the exported blob).
const CALENDARS = [
  "https://alice.btc.calendar.opentimestamps.org",
  "https://bob.btc.calendar.opentimestamps.org",
  "https://finney.calendar.eternitywall.com",
];

export interface CalendarAttestation {
  calendar: string;
  ok: boolean;
  proof_base64?: string;
  error?: string;
}

export async function submitDigestToCalendars(
  digestHex: string
): Promise<CalendarAttestation[]> {
  const digest = Buffer.from(digestHex, "hex");
  if (digest.length !== 32) throw new Error("digest must be 32 bytes (sha256)");

  const results = await Promise.all(
    CALENDARS.map(async (calendar): Promise<CalendarAttestation> => {
      try {
        const res = await fetch(`${calendar}/digest`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: digest,
        });
        if (!res.ok) return { calendar, ok: false, error: `HTTP ${res.status}` };
        const buf = Buffer.from(await res.arrayBuffer());
        return { calendar, ok: true, proof_base64: buf.toString("base64") };
      } catch (e) {
        return { calendar, ok: false, error: String(e) };
      }
    })
  );
  return results;
}
