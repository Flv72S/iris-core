/**
 * FeaturePipelineInput — C.7 (Demo-Oriented)
 * Input solo da C.6 e C.6.5. Nessun accesso a IRIS snapshot, nessuna chiamata a execution/adapter.
 */

import type { UxExperienceState } from '../ux-experience/UxExperienceState';
import type { UxStateSnapshot } from '../../messaging-system/ux-state/UxStateSnapshot';

export interface FeaturePipelineInput {
  readonly uxState: UxStateSnapshot;
  readonly experience: UxExperienceState;
  readonly now: number;
}
