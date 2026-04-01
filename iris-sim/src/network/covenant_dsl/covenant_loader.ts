/**
 * Microstep 14N — Covenant DSL. Loader: config → runtime covenants.
 */

import type { Covenant } from '../covenants/index.js';
import type { CovenantDefinition } from './covenant_dsl_types.js';
import { CovenantCompiler } from './covenant_compiler.js';

/**
 * Load and compile covenant definitions into runtime Covenant instances.
 * Invalid definitions throw; valid ones are compiled once and reused.
 */
export class CovenantLoader {
  static loadFromJSON(definitions: CovenantDefinition[]): Covenant[] {
    const covenants: Covenant[] = [];
    for (const def of definitions) {
      covenants.push(CovenantCompiler.compile(def));
    }
    return covenants;
  }
}
