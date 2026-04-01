/**
 * Phase 13XX-D — Multi-Layer Anomaly Detection. Rule registry.
 * Rules execute in deterministic order (registration order).
 */

import type { AnomalyRule } from './anomaly_rule.js';

export class AnomalyRuleRegistry {
  private readonly rules: AnomalyRule[] = [];

  registerRule(rule: AnomalyRule): void {
    if (this.rules.some((r) => r.id === rule.id)) {
      return;
    }
    this.rules.push(rule);
  }

  listRules(): AnomalyRule[] {
    return [...this.rules];
  }
}
