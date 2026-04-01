/**
 * SemanticInterpretationEngine — Valuta tutte le regole, raccoglie segnali non null.
 * NON deduplica, NON risolve conflitti. Output frozen.
 */

import type { SignalWindow } from '../../infra/signal-windowing/SignalWindow';
import type { SemanticSignal } from './SemanticSignal';
import type { SemanticRule } from './SemanticRule';
import {
  isSemanticInterpretationEnabled,
  type SemanticInterpretationRegistry,
} from './SemanticInterpretationKillSwitch';

export class SemanticInterpretationEngine {
  private readonly rules: readonly SemanticRule[];

  constructor(rules: readonly SemanticRule[]) {
    this.rules = rules;
  }

  interpret(
    windows: readonly SignalWindow[],
    now: number,
    registry?: SemanticInterpretationRegistry
  ): readonly SemanticSignal[] {
    if (registry !== undefined && !isSemanticInterpretationEnabled(registry)) {
      return Object.freeze([]);
    }
    const result: SemanticSignal[] = [];
    for (const rule of this.rules) {
      const signal = rule.evaluate(windows, now);
      if (signal !== null) result.push(signal);
    }
    return Object.freeze(result);
  }
}
