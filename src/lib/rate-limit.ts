import { ApiError } from "@/lib/http";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  sweep(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  return {
    ok: true,
    remaining: limit - bucket.count,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

export function enforceRateLimit(key: string, limit: number, windowMs: number): void {
  const result = consumeRateLimit(key, limit, windowMs);
  if (!result.ok) {
    throw new ApiError(
      429,
      `Trop de requêtes. Réessayez dans ${result.retryAfterSeconds} s.`,
      "rate_limited",
    );
  }
}

export function resetRateLimitsForTests(): void {
  buckets.clear();
}
