import type { ActionOutcome } from '../model/outcome.types';
import type { OutcomeClassification, OutcomeSemanticClass } from './outcome-classification.types';

type PartialClassification = Omit<OutcomeClassification, 'deterministicHash'>;

interface RuleRow {
  semanticClass: OutcomeSemanticClass;
  severity: number;
  recoverable: boolean;
}

const STATUS_MAP: Record<ActionOutcome['status'], RuleRow> = {
  SUCCESS: { semanticClass: 'POSITIVE', severity: 0, recoverable: false },
  FAILED: { semanticClass: 'NEGATIVE', severity: 1, recoverable: false },
  REVERTED: { semanticClass: 'RECOVERED', severity: 0.5, recoverable: true },
  IGNORED: { semanticClass: 'NEUTRAL', severity: 0, recoverable: true },
};

export function classifyOutcomeSemantics(outcome: ActionOutcome): PartialClassification {
  const row = STATUS_MAP[outcome.status];
  return {
    outcomeId: outcome.id,
    semanticClass: row.semanticClass,
    severity: row.severity,
    recoverable: row.recoverable,
  };
}
