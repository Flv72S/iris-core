/**
 * Microstep 14M — Covenant Runtime & Event Engine. Outgoing events.
 */

import type { CovenantViolation } from '../covenants/index.js';

export interface CovenantViolationEvent {
  readonly type: 'COVENANT_VIOLATION';
  readonly violations: readonly CovenantViolation[];
  readonly timestamp: number;
}
