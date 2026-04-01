/**
 * UxExperienceInterpreter — C.6.5
 * Interprete read-only: sintetizza snapshot UX in stato esperienziale singolare.
 */

import type { UxExperienceInput } from './UxExperienceInput';
import type { UxExperienceState } from './UxExperienceState';

export interface UxExperienceInterpreter {
  interpret(input: UxExperienceInput): UxExperienceState;
}
