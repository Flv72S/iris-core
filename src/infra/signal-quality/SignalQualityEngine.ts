/**
 * SignalQualityEngine — Applica regole in sequenza.
 * Nessun riordino, output frozen. Kill-switch OFF → tutti RAW.
 */

import type { SignalEvent } from '../signal-adapters/SignalEvent';
import type { QualifiedSignalEvent } from './QualifiedSignalEvent';
import type { SignalQualityRule } from './SignalQualityRule';
import {
  isSignalQualityEnabled,
  type SignalQualityRegistry,
} from './SignalQualityKillSwitch';

function toRawQualified(events: readonly SignalEvent[]): QualifiedSignalEvent[] {
  return events.map((e) =>
    Object.freeze({
      ...e,
      quality: 'RAW' as const,
      payload: e.payload,
    })
  );
}

export class SignalQualityEngine {
  private readonly rules: readonly SignalQualityRule[];

  constructor(rules: readonly SignalQualityRule[]) {
    this.rules = rules;
  }

  process(
    events: readonly SignalEvent[],
    registry?: SignalQualityRegistry
  ): readonly QualifiedSignalEvent[] {
    if (registry !== undefined && !isSignalQualityEnabled(registry)) {
      return Object.freeze(toRawQualified(events));
    }

    let current: QualifiedSignalEvent[] = toRawQualified(events);
    for (const rule of this.rules) {
      current = [...rule.apply(current)];
    }
    return Object.freeze(current);
  }
}
