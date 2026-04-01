/**
 * Learning Activation Detector — Phase 7.V+ Phase Boundary
 *
 * Verifica che durante Phase 7 non vi sia attivazione di Learning (Phase 8).
 * Se rilevato → test fallisce.
 */

export type LearningActivationViolation = {
  readonly kind: 'learning_activation';
  readonly detail: string;
};

const violations: LearningActivationViolation[] = [];

export function recordLearningActivation(detail: string): void {
  violations.push({ kind: 'learning_activation', detail });
}

export function consumeLearningActivationViolations(): readonly LearningActivationViolation[] {
  const out = [...violations];
  violations.length = 0;
  return out;
}

export function assertNoLearningActivation(): {
  ok: boolean;
  violations: readonly LearningActivationViolation[];
} {
  const v = consumeLearningActivationViolations();
  return { ok: v.length === 0, violations: v };
}
