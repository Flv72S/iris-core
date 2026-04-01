/**
 * UxState — C.6
 * Stato UX dichiarativo. MUST NOT: action, command, execute, trigger, retry, priority, score, recommendation.
 */

import type { UxStateType } from './UxStateType';

export type UxSeverity = 'info' | 'attention' | 'warning';

export interface UxState {
  readonly stateId: string;
  readonly stateType: UxStateType;
  readonly title: string;
  readonly description?: string;
  readonly severity?: UxSeverity;
  readonly relatedIds?: readonly string[];
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly derivedAt: number;
}
