/**
 * IrisActionIntentSnapshot — IRIS 12.0
 * Snapshot immutabile di intent dichiarativi. Usare Object.freeze prima dell'esposizione.
 */

import type { IrisActionIntent } from './IrisActionIntent';

export interface IrisActionIntentSnapshot {
  readonly intents: readonly IrisActionIntent[];
  readonly derivedAt: string;
}
