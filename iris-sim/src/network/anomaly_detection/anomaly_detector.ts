/**
 * Phase 13XX-D — Multi-Layer Anomaly Detection. Core detector.
 * Iterates rules in deterministic order; collects all detected events.
 */

import type { AnomalyContext } from './anomaly_rule.js';
import type { AnomalyEvent } from './anomaly_event.js';
import type { AnomalyRuleRegistry } from './anomaly_rule_registry.js';
import { freezeAnomalyEvent } from './anomaly_event.js';

export class AnomalyDetector {
  constructor(private readonly ruleRegistry: AnomalyRuleRegistry) {}

  /**
   * Run all rules in order; return immutable events. No randomness, no I/O.
   */
  detect(context: AnomalyContext): AnomalyEvent[] {
    const events: AnomalyEvent[] = [];
    const rules = this.ruleRegistry.listRules();
    for (const rule of rules) {
      const event = rule.evaluate(context);
      if (event != null) {
        events.push(freezeAnomalyEvent(event));
      }
    }
    return events;
  }
}
