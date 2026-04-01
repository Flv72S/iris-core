/**
 * Stability Layer — Diagnostic logging. Disactivable in production.
 */

let _diagnosticEnabled = false;

export function setStabilityDiagnosticEnabled(enabled: boolean): void {
  _diagnosticEnabled = enabled;
}

export function isStabilityDiagnosticEnabled(): boolean {
  return _diagnosticEnabled;
}

export function logRateLimitHit(moduleName: string, timestamp: number): void {
  if (!_diagnosticEnabled) return;
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') return;
  try {
    console.debug('[Stability] rateLimitHit', { moduleName, timestamp });
  } catch {
    // no-op if console unavailable
  }
}

export function logHysteresisBlock(moduleName: string, fromState: string, timestamp: number): void {
  if (!_diagnosticEnabled) return;
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') return;
  try {
    console.debug('[Stability] hysteresisBlock', { moduleName, fromState, timestamp });
  } catch {
    // no-op
  }
}

export function logDeltaReduction(moduleName: string, originalDelta: number, cappedDelta: number): void {
  if (!_diagnosticEnabled) return;
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') return;
  try {
    console.debug('[Stability] deltaReduction', { moduleName, originalDelta, cappedDelta });
  } catch {
    // no-op
  }
}

export function logSmoothingApplied(moduleName: string, previous: number, raw: number, smoothed: number): void {
  if (!_diagnosticEnabled) return;
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') return;
  try {
    console.debug('[Stability] smoothingApplied', { moduleName, previous, raw, smoothed });
  } catch {
    // no-op
  }
}
