/**
 * Phase 13XX-I — Trust Topology Awareness. Errors.
 */

export const TopologyErrorCode = {
  BUILD_FAILED: 'BUILD_FAILED',
  INVALID_GRAPH: 'INVALID_GRAPH',
} as const;

export type TopologyErrorCode = (typeof TopologyErrorCode)[keyof typeof TopologyErrorCode];

export class TopologyError extends Error {
  readonly code: TopologyErrorCode;

  constructor(message: string, code: TopologyErrorCode) {
    super(message);
    this.name = 'TopologyError';
    this.code = code;
    Object.setPrototypeOf(this, TopologyError.prototype);
  }
}
