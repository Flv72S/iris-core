/**
 * UxExperienceInput — C.6.5
 * Input solo da C.6. Nessun accesso a IRIS snapshot, nessuna chiamata a execution/adapter.
 */

import type { UxStateSnapshot } from '../../messaging-system/ux-state/UxStateSnapshot';

export interface UxExperienceInput {
  readonly snapshot: UxStateSnapshot;
  readonly now: number;
}
