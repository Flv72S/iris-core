/**
 * OrderedView — 8.2.2
 * Vista ordinata derivata dallo snapshot. Deterministica, stabile, senza selezione.
 * Nessuna perdita di informazione; tutti gli elementi restano presenti.
 */

import type { SemanticSnapshot } from './SemanticSnapshot';
import type { RankableSemanticState, OrderingOptions, OrderByField, OrderDirection } from './Ranking';

/**
 * Chiave di ordinamento: rank = minore prima (asc); priority/weight = maggiore prima (asc).
 * Elementi senza valore: rank asc = ultimi; priority/weight asc = ultimi.
 */
function sortKey(state: RankableSemanticState, orderBy: OrderByField, direction: OrderDirection): number {
  const raw = orderBy === 'rank' ? state.rank : orderBy === 'priority' ? state.priority : state.weight;
  const missing = orderBy === 'rank' ? Infinity : -Infinity;
  const value = raw ?? missing;
  if (orderBy === 'rank') return direction === 'Desc' ? -value : value;
  return direction === 'Desc' ? value : -value;
}

/**
 * Crea una copia dello snapshot con states ordinati secondo le opzioni dichiarate.
 * Ordinamento stabile: stesso chiave → ordine di arrivo. Nessun filtro; tutti gli elementi restano.
 */
export function createOrderedView(
  snapshot: SemanticSnapshot,
  options: OrderingOptions
): SemanticSnapshot {
  const { orderBy, direction } = options;
  const states = [...snapshot.states] as RankableSemanticState[];
  states.sort((a, b) => {
    const ka = sortKey(a, orderBy, direction);
    const kb = sortKey(b, orderBy, direction);
    if (ka !== kb) return ka - kb;
    return 0;
  });
  return Object.freeze({
    ...snapshot,
    states: Object.freeze(states),
  });
}
