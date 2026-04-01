/**
 * Static Architecture Rules
 * Microstep 5.5.1
 */

export type { ImportGraph, ImportEdge, Violation, ArchitectureRule } from './types';
export { getNodes, getImportsFrom, normalizePath } from './types';
export {
  CQRS_RULES,
  checkCqrsRules,
  isReadSidePath,
  isWriteSidePath,
} from './cqrs.rules';
export {
  LAYERING_RULES,
  checkLayeringRules,
  pathToLayer,
  getAllowedDependencies,
  canDependOn,
  type Layer,
} from './layering.rules';
