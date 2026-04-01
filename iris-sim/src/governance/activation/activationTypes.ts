/**
 * Step 6D — Governance activation preparation types.
 * Foundation for future activation; no enforcement, observer-first.
 */

import type { GovernanceSignal } from '../governanceTypes.js';
import type { GovernanceStabilityReport } from '../governanceSignalStabilityTypes.js';
import type { PlateauStrength } from '../../stability/dynamics/dynamicsTypes.js';

export type GovernanceTargetModule =
  | 'ADAPTIVE_WEIGHTS'
  | 'AGENT_AUTOMATION'
  | 'COMMUNITY_MODERATION'
  | 'MEDIA_INTELLIGENCE'
  | 'MESSAGE_ROUTING'
  | 'SECOND_BRAIN_LAYER';

export interface GovernanceActivationIntent {
  readonly targetModule: GovernanceTargetModule;
  readonly signalSnapshot: Readonly<GovernanceSignal>;
  readonly stabilityReportSnapshot: Readonly<GovernanceStabilityReport>;
  readonly dynamicsSummaryScore: number;
  readonly residualRiskScore: number;
  readonly readinessConfidence: number;
}

export interface GovernanceActivationReadinessReport {
  readonly moduleName: GovernanceTargetModule;
  readonly intentAllowed: boolean;
  readonly dynamicsSummaryScore: number;
  readonly residualRiskScore: number;
  readonly readinessConfidence: number;
  readonly plateauState: PlateauStrength;
  readonly stabilityFlag: boolean;
  readonly recommendationText?: string;
}
