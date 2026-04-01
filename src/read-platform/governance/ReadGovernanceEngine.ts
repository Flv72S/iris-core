/**
 * Read Governance Engine — MOTORE PURO
 * Valuta regole in ordine, determina status più severo, aggrega reasons.
 */

import type { ReadGovernanceDecision } from './ReadGovernanceDecision';
import type { ReadGovernanceRule } from './ReadGovernanceRule';

const SEVERITY_ORDER: ReadGovernanceDecision['status'][] = [
  'healthy',
  'degraded',
  'unreliable',
];

function severityRank(s: ReadGovernanceDecision['status']): number {
  const i = SEVERITY_ORDER.indexOf(s);
  return i >= 0 ? i : 0;
}

function isMoreSevere(
  a: ReadGovernanceDecision['status'],
  b: ReadGovernanceDecision['status']
): boolean {
  return severityRank(a) > severityRank(b);
}

export class ReadGovernanceEngine<Input> {
  constructor(
    private readonly rules: ReadGovernanceRule<Input>[]
  ) {}

  evaluate(input: Input): ReadGovernanceDecision {
    const decisions: ReadGovernanceDecision[] = [];
    for (const rule of this.rules) {
      const d = rule.evaluate(input);
      if (d !== null) {
        decisions.push(d);
      }
    }

    if (decisions.length === 0) {
      return { status: 'healthy', reasons: [] };
    }

    let status: ReadGovernanceDecision['status'] = 'healthy';
    const reasons: string[] = [];
    for (const d of decisions) {
      if (isMoreSevere(d.status, status)) {
        status = d.status;
      }
      reasons.push(...d.reasons);
    }

    return { status, reasons };
  }
}
