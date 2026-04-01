/** 16F.5.FINAL — typed failures for SDK audit/replay surfaces (no silent fallback; strict vs unsafe replay). */

export class DeterminismViolationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'DeterminismViolationError';
  }
}

export class SnapshotIntegrityError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'SnapshotIntegrityError';
  }
}

/** Hash / prevHash / structural index invariant failed (chain-of-trust). */
export class InvariantViolationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'InvariantViolationError';
  }
}
