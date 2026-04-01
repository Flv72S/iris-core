/**
 * Preference Mutation Detector — Phase 7.V+ Phase Boundary
 *
 * Verifica che durante Phase 7 non vi siano mutazioni di User Preferences
 * al di fuori del flusso di Resolution (Phase 6.5). Se rilevato → test fallisce.
 */

export type PreferenceMutationViolation = {
  readonly kind: 'preference_mutation';
  readonly detail: string;
};

const violations: PreferenceMutationViolation[] = [];

export function recordPreferenceMutation(detail: string): void {
  violations.push({ kind: 'preference_mutation', detail });
}

export function consumePreferenceMutationViolations(): readonly PreferenceMutationViolation[] {
  const out = [...violations];
  violations.length = 0;
  return out;
}

export function assertNoPreferenceMutations(): {
  ok: boolean;
  violations: readonly PreferenceMutationViolation[];
} {
  const v = consumePreferenceMutationViolations();
  return { ok: v.length === 0, violations: v };
}
