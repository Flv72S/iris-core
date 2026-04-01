/**
 * ExecutionSemanticHint - C.4.B
 * Hint dichiarativo. Nessuna esecuzione.
 */

export const EXECUTION_SEMANTIC_HINT_TYPES = [
  'VOICE_PREFERRED',
  'AI_ONLY',
  'USER_CONFIRMATION_RECOMMENDED',
  'BACKGROUND_EXECUTION_POSSIBLE',
] as const;

export type ExecutionSemanticHintType = (typeof EXECUTION_SEMANTIC_HINT_TYPES)[number];

export interface ExecutionSemanticHint {
  readonly hintId: string;
  readonly actionPlanId: string;
  readonly hintType: ExecutionSemanticHintType;
  readonly description: string;
  readonly declaredAt: string;
}
