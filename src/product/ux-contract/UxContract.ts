/**
 * UxContract — Contratto formale e vincolante tra Product Core (C.6→C.9) e qualsiasi UI.
 * Read-only, deterministico. La UI riceve, visualizza; non modifica, non decide.
 */

import type { UxStateSnapshot } from '../../messaging-system/ux-state/UxStateSnapshot';
import type { UxExperienceState } from '../ux-experience/UxExperienceState';
import type { OrchestratedFeature } from '../orchestration/OrchestratedFeature';
import type { UxContractMeta } from './UxContractMeta';

export interface UxContract {
  readonly uxState: UxStateSnapshot;
  readonly experience: UxExperienceState;
  readonly features: readonly OrchestratedFeature[];
  readonly meta: UxContractMeta;
}

// Questo UX Contract definisce l'unica interfaccia ammessa
// tra il prodotto IRIS e qualsiasi UI.
// E' read-only, deterministico e vincolante.
