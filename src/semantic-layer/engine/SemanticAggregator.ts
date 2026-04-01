/**
 * SemanticAggregator — 8.2.1
 * Contratto di aggregazione: operazione meccanica, append-only, nessuna logica semantica.
 * NON filtra, ordina o interpreta; NON priorità, override o deduplicazione.
 */

import type { SemanticModule } from './SemanticModule';
import type { SemanticInput } from './SemanticInput';
import type { SemanticSnapshot } from './SemanticSnapshot';
import { createEmptySnapshot } from './SemanticSnapshot';
import type { SemanticModuleOutput } from './SemanticModuleOutput';
import { isModuleOutputShape } from './SemanticModuleOutput';

export type IsModuleEnabled = (module: SemanticModule, index: number) => boolean;

export interface AggregateOptions {
  /** Se fornito, solo i moduli per cui isEnabled(module, index) è true sono valutati. Default: tutti abilitati. */
  isEnabled?: IsModuleEnabled;
}

/**
 * Merge append-only: concatena gli array del contribution allo snapshot corrente.
 * Nessun override, nessuna deduplicazione, nessuna priorità.
 */
function mergeAppendOnly(
  current: SemanticSnapshot,
  contribution: SemanticModuleOutput
): SemanticSnapshot {
  return Object.freeze({
    states: Object.freeze([...current.states, ...(contribution.states ?? [])]),
    contexts: Object.freeze([...current.contexts, ...(contribution.contexts ?? [])]),
    rankings: Object.freeze([...current.rankings, ...(contribution.rankings ?? [])]),
    explanations: Object.freeze([...current.explanations, ...(contribution.explanations ?? [])]),
    policies: Object.freeze([...current.policies, ...(contribution.policies ?? [])]),
  });
}

/**
 * Aggrega gli output dei moduli in un unico SemanticSnapshot.
 * Ordine di valutazione: ordine dell'array modules (dichiarato, non semantico).
 * Moduli disabilitati (isEnabled false): output ignorato.
 * Nessuna logica decisionale; nessuna priorità; append-only.
 */
export function aggregate(
  modules: readonly SemanticModule[],
  input: SemanticInput,
  options: AggregateOptions = {}
): SemanticSnapshot {
  const { isEnabled = () => true } = options;
  let snapshot = createEmptySnapshot();

  for (let i = 0; i < modules.length; i++) {
    const module = modules[i];
    if (!isEnabled(module, i)) continue;

    const result = module.evaluate(input);
    if (result === null || result.overlay === null) continue;

    if (!isModuleOutputShape(result.overlay)) continue;
    snapshot = mergeAppendOnly(snapshot, result.overlay);
  }

  return snapshot;
}
