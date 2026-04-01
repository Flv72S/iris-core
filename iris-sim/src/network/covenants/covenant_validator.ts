/**
 * Microstep 14L — AI Covenant Monitoring Platform. Validator.
 */

import type { CovenantResult } from './covenant_types.js';

export class CovenantValidator {
  /**
   * Returns true iff every result has valid === true.
   */
  static validateResults(results: readonly CovenantResult[]): boolean {
    return results.every((r) => r.valid);
  }
}
