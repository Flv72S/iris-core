/**
 * Builder deterministico del UX Contract per demo.
 * Legge dal catalogo; applica solo meta (productMode, generatedAt, contractVersion).
 * Non modifica stati, experience o feature. Nessun filtro, riordino o deduplicazione.
 */

import type { UxContract, UxContractMeta } from '../ux-contract';
import { UX_CONTRACT_VERSION } from '../ux-contract';
import type { DemoScenarioId } from './DemoScenarioId';
import { DEMO_SCENARIOS } from './demoScenarioCatalog';
import {
  DEMO_SCENARIO_COMPONENT_ID,
  isDemoScenarioEnabled,
  type DemoScenarioRegistry,
} from './DemoScenarioKillSwitch';

type ProductMode = 'DEFAULT' | 'FOCUS' | 'WELLBEING';

/**
 * Costruisce un UxContract deterministico per lo scenario e mode dati.
 * Se registry è fornito e demo-scenarios è OFF, restituisce sempre NEUTRAL_IDLE.
 * Non modifica gli oggetti di scenario; crea solo meta e wrapper.
 */
export function buildDemoUxContract(
  scenarioId: DemoScenarioId,
  productMode: ProductMode,
  now: number,
  registry?: DemoScenarioRegistry
): UxContract {
  const effectiveId: DemoScenarioId =
    registry && !isDemoScenarioEnabled(registry)
      ? 'NEUTRAL_IDLE'
      : scenarioId;

  const scenario = DEMO_SCENARIOS[effectiveId];

  const meta: UxContractMeta = Object.freeze({
    productMode,
    generatedAt: now,
    contractVersion: UX_CONTRACT_VERSION,
  });

  return Object.freeze({
    uxState: scenario.uxState,
    experience: scenario.experience,
    features: scenario.features,
    meta,
  });
}
