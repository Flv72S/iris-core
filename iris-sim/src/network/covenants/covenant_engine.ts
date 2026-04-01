/**
 * Microstep 14L — AI Covenant Monitoring Platform. Engine.
 */

import type { CovenantRegistry } from './covenant_registry.js';
import { CovenantExecutor } from './covenant_executor.js';
import { CovenantValidator } from './covenant_validator.js';
import type { CovenantContext } from './covenant_context.js';
import type { CovenantEvaluationReport } from './covenant_types.js';

export class CovenantEngine {
  constructor(private readonly registry: CovenantRegistry) {}

  evaluate(context: CovenantContext): CovenantEvaluationReport {
    const covenants = this.registry.getAll();
    const results = CovenantExecutor.executeAll(covenants, context);
    const valid = CovenantValidator.validateResults(results);
    const violations = results.flatMap((r) => r.violations);
    return Object.freeze({
      valid,
      results: Object.freeze([...results]),
      violations: Object.freeze([...violations]),
      evaluated_at: Date.now(),
    });
  }
}
