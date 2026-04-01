/**
 * Microstep 14N — Covenant DSL. Compiler: DSL definition → runtime Covenant.
 */

import type { Covenant, CovenantContext, CovenantResult } from '../covenants/index.js';
import { CovenantSeverity } from '../covenants/index.js';
import { evaluate } from './expression_evaluator.js';
import { parseCondition } from './covenant_parser.js';
import type { CovenantDefinition } from './covenant_dsl_types.js';
import { CovenantDSLError, CovenantDSLErrorCode } from './covenant_dsl_errors.js';

const SEVERITY_MAP: Record<string, CovenantSeverity> = {
  LOW: CovenantSeverity.LOW,
  MEDIUM: CovenantSeverity.MEDIUM,
  HIGH: CovenantSeverity.HIGH,
  CRITICAL: CovenantSeverity.CRITICAL,
};

function toSeverity(s: string): CovenantSeverity {
  const v = SEVERITY_MAP[s];
  if (v === undefined) {
    throw new CovenantDSLError(CovenantDSLErrorCode.INVALID_DEFINITION, `Invalid severity: ${s}`);
  }
  return v;
}

/**
 * Compile a covenant definition into a runtime Covenant.
 * Validates condition at compile time; throws on invalid/unsafe expression.
 */
export class CovenantCompiler {
  static compile(def: CovenantDefinition): Covenant {
    if (typeof def.id !== 'string' || def.id.length === 0) {
      throw new CovenantDSLError(CovenantDSLErrorCode.INVALID_DEFINITION, 'Missing or invalid id');
    }
    if (typeof def.name !== 'string' || def.name.length === 0) {
      throw new CovenantDSLError(CovenantDSLErrorCode.INVALID_DEFINITION, 'Missing or invalid name');
    }
    if (typeof def.condition !== 'string') {
      throw new CovenantDSLError(CovenantDSLErrorCode.INVALID_DEFINITION, 'Missing or invalid condition');
    }
    const severity = toSeverity(def.severity);
    parseCondition(def.condition);

    return {
      id: def.id,
      name: def.name,
      ...(def.description != null ? { description: def.description } : {}),
      validate(ctx: CovenantContext): CovenantResult {
        if (!def.enabled) {
          return { covenant_id: def.id, valid: true, violations: [] };
        }
        let result: boolean;
        try {
          result = evaluate(def.condition, ctx);
        } catch (e) {
          return {
            covenant_id: def.id,
            valid: false,
            violations: [
              {
                type: 'DSL_EVALUATION_ERROR',
                message: (e as Error).message,
                severity,
              },
            ],
          };
        }
        if (!result) {
          return {
            covenant_id: def.id,
            valid: false,
            violations: [
              {
                type: 'DSL_CONDITION_FAILED',
                message: def.condition,
                severity,
              },
            ],
          };
        }
        return { covenant_id: def.id, valid: true, violations: [] };
      },
    };
  }
}
