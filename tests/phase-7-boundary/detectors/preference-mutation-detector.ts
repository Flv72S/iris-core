/**
 * Preference Mutation Detector — Phase 7.F Boundary Attestation
 *
 * Garantisce che User Preferences rimangano immutate durante Phase 7.
 * Snapshot iniziale → esecuzione → deep structural compare finale.
 */

export type PreferenceBoundaryResult = {
  readonly mutated: boolean;
  readonly diff?: unknown;
  readonly passed: boolean;
};

let baselineSnapshot: string | null = null;

export function setPreferenceBaseline(snapshot: unknown): void {
  baselineSnapshot =
    typeof snapshot === 'object' && snapshot !== null
      ? JSON.stringify(snapshot, Object.keys(snapshot).sort())
      : JSON.stringify(snapshot);
}

export function comparePreferenceToBaseline(current: unknown): PreferenceBoundaryResult {
  if (baselineSnapshot == null) {
    return Object.freeze({ mutated: false, passed: true });
  }
  const currentStr =
    typeof current === 'object' && current !== null
      ? JSON.stringify(current, Object.keys(current).sort())
      : JSON.stringify(current);
  const mutated = currentStr !== baselineSnapshot;
  let diff: unknown;
  if (mutated) {
    try {
      const base = JSON.parse(baselineSnapshot) as object;
      const cur = JSON.parse(currentStr) as object;
      const keysA = Object.keys(base).sort();
      const keysB = Object.keys(cur).sort();
      if (keysA.join(',') !== keysB.join(',')) {
        diff = { keysA, keysB };
      } else {
        for (const k of keysA) {
          const va = (base as Record<string, unknown>)[k];
          const vb = (cur as Record<string, unknown>)[k];
          if (JSON.stringify(va) !== JSON.stringify(vb)) {
            diff = { key: k, expected: va, actual: vb };
            break;
          }
        }
      }
    } catch {
      diff = { baseline: baselineSnapshot, current: currentStr };
    }
  }
  return Object.freeze({
    mutated,
    diff: mutated ? diff : undefined,
    passed: !mutated,
  });
}

export function resetPreferenceMutationDetector(): void {
  baselineSnapshot = null;
}
