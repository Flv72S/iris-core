/**
 * Phase 13XX-D — Multi-Layer Anomaly Detection. Errors.
 */

export const AnomalyDetectionErrorCode = {
  INVALID_CONTEXT: 'INVALID_CONTEXT',
  RULE_EVALUATION_FAILED: 'RULE_EVALUATION_FAILED',
} as const;

export type AnomalyDetectionErrorCode =
  (typeof AnomalyDetectionErrorCode)[keyof typeof AnomalyDetectionErrorCode];

export class AnomalyDetectionError extends Error {
  readonly code: AnomalyDetectionErrorCode;

  constructor(message: string, code: AnomalyDetectionErrorCode) {
    super(message);
    this.name = 'AnomalyDetectionError';
    this.code = code;
    Object.setPrototypeOf(this, AnomalyDetectionError.prototype);
  }
}
