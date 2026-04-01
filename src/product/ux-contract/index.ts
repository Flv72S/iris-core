/**
 * UX Contract — Interfaccia read-only tra Product Core e qualsiasi UI.
 * Fonte di verità per stato, experience e feature.
 */

export type { UxContract } from './UxContract';
export type { UxContractMeta } from './UxContractMeta';
export { UX_CONTRACT_VERSION } from './contractVersion';

// Re-export tipi usati dal contratto (UI e demo-scenarios possono importare solo da qui)
export type { UxStateSnapshot } from '../../messaging-system/ux-state/UxStateSnapshot';
export type { UxState, UxSeverity } from '../../messaging-system/ux-state/UxState';
export type { UxStateType } from '../../messaging-system/ux-state/UxStateType';
export type { UxExperienceState } from '../ux-experience/UxExperienceState';
export type { OrchestratedFeature, OrchestratedVisibility, OrchestratedPriority } from '../orchestration/OrchestratedFeature';
export type { ProductMode } from '../orchestration/ProductMode';
