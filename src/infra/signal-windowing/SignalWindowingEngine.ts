/**
 * SignalWindowingEngine — Invoca tutte le strategie, concatena le finestre.
 * Nessuna deduplicazione. Kill-switch OFF → [].
 */

import type { QualifiedSignalEvent } from '../signal-quality/QualifiedSignalEvent';
import type { SignalWindow } from './SignalWindow';
import type { SignalWindowingStrategy } from './SignalWindowingStrategy';
import {
  isSignalWindowingEnabled,
  type SignalWindowingRegistry,
} from './SignalWindowingKillSwitch';

export class SignalWindowingEngine {
  private readonly strategies: readonly SignalWindowingStrategy[];

  constructor(strategies: readonly SignalWindowingStrategy[]) {
    this.strategies = strategies;
  }

  build(
    events: readonly QualifiedSignalEvent[],
    now: number,
    registry?: SignalWindowingRegistry
  ): readonly SignalWindow[] {
    if (registry !== undefined && !isSignalWindowingEnabled(registry)) {
      return Object.freeze([]);
    }
    const result: SignalWindow[] = [];
    for (const strategy of this.strategies) {
      const windows = strategy.build(events, now);
      for (let i = 0; i < windows.length; i++) {
        result.push(windows[i]);
      }
    }
    return Object.freeze(result);
  }
}
