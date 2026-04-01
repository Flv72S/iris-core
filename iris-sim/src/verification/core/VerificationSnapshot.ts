/**
 * S-3 — Verification state snapshot. Serializable for restore.
 */

export interface VerificationSnapshotData {
  readonly lastTick: string;
  readonly propertyStates: Readonly<Record<string, string>>;
  readonly deliveredKeys: readonly string[];
}

export function serializeVerificationState(
  lastTick: bigint,
  propertyStates: Readonly<Record<string, string>>,
  deliveredKeys: ReadonlySet<string>,
): VerificationSnapshotData {
  return Object.freeze({
    lastTick: String(lastTick),
    propertyStates: Object.freeze({ ...propertyStates }),
    deliveredKeys: [...deliveredKeys],
  });
}
