/**
 * DemoScenarioDefinition — Definizione deterministica di uno scenario.
 * Tutti i campi validi secondo ux-contract. Solo composizione, nessuna logica.
 */

import type {
  UxStateSnapshot,
  UxExperienceState,
  OrchestratedFeature,
} from '../ux-contract';
import type { DemoScenarioId } from './DemoScenarioId';

export interface DemoScenarioDefinition {
  readonly id: DemoScenarioId;
  readonly description: string;
  readonly uxState: UxStateSnapshot;
  readonly experience: UxExperienceState;
  readonly features: readonly OrchestratedFeature[];
}
