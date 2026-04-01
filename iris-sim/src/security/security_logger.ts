/**
 * Microstep 16D.X1.HARDENING — Structured security events.
 */

export interface SecurityLogSink {
  log(event: string, meta: Record<string, unknown>): void;
}

function sanitizeMeta(meta?: Record<string, unknown>): Record<string, unknown> {
  if (!meta) return {};
  const clone: Record<string, unknown> = { ...meta };
  if ('nextSecret' in clone) clone.nextSecret = '[REDACTED]';
  if ('activeSecret' in clone) clone.activeSecret = '[REDACTED]';
  if ('secret' in clone) clone.secret = '[REDACTED]';
  if ('sharedSecret' in clone) clone.sharedSecret = '[REDACTED]';
  if ('channelKeyHex' in clone) clone.channelKeyHex = '[REDACTED]';
  if ('ephemeralPublicKey' in clone) clone.ephemeralPublicKey = '[REDACTED]';
  if ('ephemeralSignature' in clone) clone.ephemeralSignature = '[REDACTED]';
  if ('privateKey' in clone) clone.privateKey = '[REDACTED]';
  return clone;
}

class ConsoleSecuritySink implements SecurityLogSink {
  log(event: string, meta: Record<string, unknown>): void {
    console.warn(
      JSON.stringify({
        type: 'IRIS_SECURITY_EVENT',
        event,
        timestamp: Date.now(),
        ...meta,
      }),
    );
  }
}

const WINDOW_MS = 10_000;
const MAX_EVENTS_PER_WINDOW = 100;
const eventCounters = new Map<string, number>();
let rateLimitInterval: NodeJS.Timeout | null = null;

function resetCounters(): void {
  eventCounters.clear();
}

function ensureRateLimitInterval(): void {
  if (rateLimitInterval) return;
  rateLimitInterval = setInterval(() => {
    resetCounters();
  }, WINDOW_MS);
  if (typeof rateLimitInterval.unref === 'function') {
    rateLimitInterval.unref();
  }
}

let currentSink: SecurityLogSink = new ConsoleSecuritySink();

export function setSecurityLogSink(sink: SecurityLogSink): void {
  currentSink = sink;
}

export function securityLog(event: string, meta?: Record<string, unknown>): void {
  ensureRateLimitInterval();
  const count = eventCounters.get(event) ?? 0;
  if (count >= MAX_EVENTS_PER_WINDOW) return;
  eventCounters.set(event, count + 1);
  currentSink.log(event, sanitizeMeta(meta));
}

export function shutdownSecurityLogger(): void {
  if (rateLimitInterval) {
    clearInterval(rateLimitInterval);
    rateLimitInterval = null;
  }
  eventCounters.clear();
}
