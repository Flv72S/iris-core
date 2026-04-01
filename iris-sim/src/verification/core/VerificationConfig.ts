/**
 * S-3 — Verification engine configuration.
 */

export interface VerificationConfig {
  readonly maxTraceWindowSize: number;
  readonly livenessWindowTicks: bigint;
}

export const DEFAULT_VERIFICATION_CONFIG: VerificationConfig = Object.freeze({
  maxTraceWindowSize: 10000,
  livenessWindowTicks: 500n,
});

export function createVerificationConfig(overrides: Partial<VerificationConfig> = {}): VerificationConfig {
  return Object.freeze({ ...DEFAULT_VERIFICATION_CONFIG, ...overrides });
}
