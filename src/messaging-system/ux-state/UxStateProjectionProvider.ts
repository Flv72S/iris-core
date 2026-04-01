/**
 * UxStateProjectionProvider — C.6
 * Provider di proiezione read-only: trasforma snapshot in UxState.
 */

import type { UxProjectionInput } from './UxProjectionInput';
import type { UxState } from './UxState';

export interface UxStateProjectionProvider {
  readonly id: string;
  project(input: UxProjectionInput): readonly UxState[] | null;
}
