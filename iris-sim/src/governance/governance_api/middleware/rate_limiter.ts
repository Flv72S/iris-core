/**
 * Step 8A — Rate limiter. Default 100 requests/minute, configurable via IRIS_PUBLIC_API_RATE_LIMIT.
 */

const DEFAULT_RATE_LIMIT_PER_MINUTE = 100;

export function getRateLimitPerMinute(): number {
  const env = process.env.IRIS_PUBLIC_API_RATE_LIMIT;
  if (env === undefined || env === '') return DEFAULT_RATE_LIMIT_PER_MINUTE;
  const n = Math.floor(Number(env));
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_RATE_LIMIT_PER_MINUTE;
}

/** In-memory sliding window: key -> timestamps of requests in current window */
const windowMs = 60 * 1000;

export interface RateLimitState {
  counts: Map<string, number[]>;
}

export function createRateLimitState(): RateLimitState {
  return { counts: new Map() };
}

function now(): number {
  return Date.now();
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number | undefined;
}

export function rateLimiter(
  state: RateLimitState,
  key: string,
  limitPerMinute: number
): RateLimitResult {
  const ts = now();
  const list = state.counts.get(key) ?? [];
  const cutoff = ts - windowMs;
  const recent = list.filter((t) => t > cutoff);
  recent.push(ts);
  state.counts.set(key, recent);

  if (recent.length <= limitPerMinute) {
    const oldest = Math.min(...recent);
    const windowEnd = oldest + windowMs;
    const retryAfterMs = windowEnd - ts;
    return {
      allowed: true,
      remaining: Math.max(0, limitPerMinute - recent.length),
      retryAfterMs: retryAfterMs > 0 ? retryAfterMs : undefined,
    };
  }

  const oldestInWindow = Math.min(...recent);
  return {
    allowed: false,
    remaining: 0,
    retryAfterMs: oldestInWindow + windowMs - ts,
  };
}
