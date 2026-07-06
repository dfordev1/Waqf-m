// Simple fixed-window in-memory rate limiter for public API routes.
// Per-instance only: on serverless each warm instance keeps its own counters,
// so treat the limit as per-instance best-effort abuse damping, not a hard
// global quota (upgrade to Upstash/Redis when traffic justifies it).
const windows = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000;

export function rateLimit(
  req: Request,
  route: string,
  maxPerMinute: number
): { ok: true } | { ok: false; retryAfter: number } {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "local";
  const key = `${route}:${ip}`;
  const now = Date.now();
  const w = windows.get(key);
  if (!w || now >= w.resetAt) {
    windows.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }
  if (w.count >= maxPerMinute) {
    return { ok: false, retryAfter: Math.ceil((w.resetAt - now) / 1000) };
  }
  w.count++;
  return { ok: true };
}

export function tooMany(retryAfter: number): Response {
  return new Response(
    JSON.stringify({ error: "rate limit exceeded", retry_after_s: retryAfter }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    }
  );
}

// housekeeping: drop stale windows occasionally so the map doesn't grow forever
setInterval(() => {
  const now = Date.now();
  for (const [k, w] of windows) if (now >= w.resetAt) windows.delete(k);
}, WINDOW_MS).unref?.();
