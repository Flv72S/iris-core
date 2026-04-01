/**
 * UX Experience State — C.6.5
 * Sintesi semantica di snapshot UX atomico in stato esperienziale singolare.
 */

export type {
  UxExperienceState,
  UxExperienceLabel,
  ConfidenceBand,
  StabilityLevel,
  UxSuggestedLens,
} from './UxExperienceState';
export type { UxExperienceInput } from './UxExperienceInput';
export type { UxExperienceInterpreter } from './UxExperienceInterpreter';
export {
  UX_EXPERIENCE_COMPONENT_ID,
  isUxExperienceEnabled,
  neutralExperienceState,
  type UxExperienceRegistry,
} from './UxExperienceKillSwitch';
export {
  DefaultUxExperienceInterpreter,
  interpretUxExperience,
} from './DefaultUxExperienceInterpreter';
