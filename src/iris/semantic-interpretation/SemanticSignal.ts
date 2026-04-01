/**
 * SemanticSignal — Significato esplicito da pattern temporali.
 * MUST NOT: action, recommendation, priority, score, UX fields.
 */

export type SemanticSignalType =
  | 'FOCUS_CONTEXT'
  | 'WAITING_CONTEXT'
  | 'INTERRUPTION_CONTEXT'
  | 'OVERLOAD_CONTEXT'
  | 'WELLBEING_RISK'
  | 'IDLE_CONTEXT';

export interface SemanticSignal {
  readonly id: string;
  readonly type: SemanticSignalType;
  readonly detectedAt: number;
  readonly sourceWindowIds: readonly string[];
  readonly evidence: readonly string[];
}
