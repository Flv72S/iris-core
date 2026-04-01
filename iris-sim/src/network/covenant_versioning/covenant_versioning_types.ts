/**
 * Microstep 14P — Versioning & Immutable History. Types.
 */

import type { CovenantDefinition } from '../covenant_dsl/index.js';
import type { CovenantPersistenceAction } from '../covenant_persistence/index.js';

export interface CovenantVersion {
  readonly covenant_id: string;
  readonly version: number;
  readonly definition: CovenantDefinition;
  readonly timestamp: number;
  readonly action: CovenantPersistenceAction;
}
