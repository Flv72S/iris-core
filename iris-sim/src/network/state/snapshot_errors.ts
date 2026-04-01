/**
 * Phase 14B — Snapshot Engine. Errors.
 */

export enum SnapshotErrorCode {
  INVALID_SNAPSHOT = 'INVALID_SNAPSHOT',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  HASH_MISMATCH = 'HASH_MISMATCH',
  INVALID_PAYLOAD = 'INVALID_PAYLOAD',
  INVALID_VECTOR_CLOCK = 'INVALID_VECTOR_CLOCK',
}

export class SnapshotError extends Error {
  constructor(
    public readonly code: SnapshotErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'SnapshotError';
    Object.setPrototypeOf(this, SnapshotError.prototype);
  }
}
