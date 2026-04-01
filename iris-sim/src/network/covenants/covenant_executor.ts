/**
 * Microstep 14L — AI Covenant Monitoring Platform. Executor.
 * Runs all covenants; MUST NOT crash system — failures become violations.
 */

import type { Covenant, CovenantResult, CovenantViolation } from './covenant_types.js';
import { CovenantSeverity } from './covenant_types.js';
import type { CovenantContext } from './covenant_context.js';
import { CovenantErrorCode } from './covenant_errors.js';

function violation(type: string, message: string, severity: CovenantSeverity): CovenantViolation {
  return Object.freeze({ type, message, severity });
}

export class CovenantExecutor {
  /**
   * Execute all covenants over the context. O(n).
   * Throwing covenants are converted to a single violation result (system must not crash).
   */
  static executeAll(covenants: readonly Covenant[], context: CovenantContext): CovenantResult[] {
    const results: CovenantResult[] = [];
    for (const covenant of covenants) {
      let result: CovenantResult;
      try {
        result = covenant.validate(context);
      } catch (e) {
        result = {
          covenant_id: covenant.id,
          valid: false,
          violations: [
            violation(
              CovenantErrorCode.COVENANT_THREW,
              (e as Error).message,
              CovenantSeverity.CRITICAL,
            ),
          ],
        };
      }
      results.push(result);
    }
    return results;
  }
}
