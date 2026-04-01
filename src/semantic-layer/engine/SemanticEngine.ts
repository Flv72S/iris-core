/**
 * SemanticEngine — 8.2.0 + 8.2.1 + 8.2.2 + 8.2.3
 * Aggregazione append-only; ordinamento descrittivo; explanations opzionali (kill-switch).
 */

import type { Phase8KillSwitchRegistry } from '../contracts';
import { createEmptySnapshot } from './SemanticSnapshot';
import { isSemanticEngineEnabled, isRankingEnabled, isExplanationsEnabled } from './SemanticKillSwitch';
import { aggregate } from './SemanticAggregator';
import { createOrderedView } from './OrderedView';
import type { OrderingOptions } from './Ranking';
import type { SemanticInput } from './SemanticInput';
import type { SemanticSnapshot } from './SemanticSnapshot';
import type { SemanticModule } from './SemanticModule';

const EMPTY_EXPLANATIONS: readonly never[] = Object.freeze([]);

const DEFAULT_ORDERING: OrderingOptions = { orderBy: 'rank', direction: 'Asc' };

/**
 * Semantic Engine — 8.2.1 aggregazione, 8.2.2 ranking, 8.2.3 explanations (solo kill-switch).
 * - Kill-switch OFF → snapshot vuoto.
 * - Explanations OFF → stesso snapshot con explanations: [] (altri campi invariati).
 */
export class SemanticEngine {
  constructor(
    private readonly killSwitch: Phase8KillSwitchRegistry,
    private readonly modules: readonly SemanticModule[] = [],
    private readonly orderingOptions: OrderingOptions = DEFAULT_ORDERING
  ) {}

  /**
   * Valuta l'input e restituisce un SemanticSnapshot.
   * Con explanations OFF restituisce snapshot con explanations: []; stati/contexts/rankings/policies invariati.
   */
  evaluate(input: SemanticInput): SemanticSnapshot {
    if (!isSemanticEngineEnabled(this.killSwitch)) {
      return createEmptySnapshot();
    }
    if (this.modules.length === 0) {
      return createEmptySnapshot();
    }
    let snapshot = aggregate(this.modules, input, { isEnabled: () => true });
    if (isRankingEnabled(this.killSwitch)) {
      snapshot = createOrderedView(snapshot, this.orderingOptions);
    }
    if (!isExplanationsEnabled(this.killSwitch)) {
      return Object.freeze({
        ...snapshot,
        explanations: EMPTY_EXPLANATIONS,
      });
    }
    return snapshot;
  }
}
