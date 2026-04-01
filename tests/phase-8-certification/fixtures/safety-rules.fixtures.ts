/**
 * Phase 8 Certification — Safety rules fixtures (use catalog)
 */

import { SAFETY_RULE_CATALOG } from '../../../phase-8-feedback/safety/rules/safety-rule.catalog';

export function getCertificationRules(): typeof SAFETY_RULE_CATALOG {
  return SAFETY_RULE_CATALOG;
}
