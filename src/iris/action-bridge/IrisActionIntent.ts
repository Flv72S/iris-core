/**
 * IrisActionIntent — IRIS 12.0 / 12.1
 * Tipo dichiarativo: cosa sarebbe coerente fare in base a una selezione.
 * intentType MUST usare IrisActionIntentType (12.1).
 * MUST NOT: execute, send, trigger, command, adapter, delivery, retry, priority, schedule.
 */

import type { IrisActionIntentType } from './IrisActionIntentType';

export interface IrisActionIntent {
  readonly intentId: string;
  readonly selectionId: string;
  readonly intentType: IrisActionIntentType;
  readonly description: string;
  readonly constraints?: Readonly<Record<string, unknown>>;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly derivedAt: string;
}
