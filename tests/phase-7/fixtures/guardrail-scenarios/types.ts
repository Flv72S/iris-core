/**
 * Guardrail scenario fixture types.
 */

export type GuardrailScenarioId =
  | 'max-actions-per-window'
  | 'cooldown-per-feature'
  | 'abort-system-condition'
  | 'abort-user-condition';

export type GuardrailScenarioFixture = {
  readonly id: GuardrailScenarioId;
  readonly description: string;
  readonly params: Readonly<Record<string, unknown>>;
};
