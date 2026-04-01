/**
 * Step 8B — Policy DSL parser. IF ... THEN ... → GovernancePolicy.
 */

import type { GovernancePolicy, PolicyCondition, PolicyAction, PolicyOperator } from '../types/policy_types.js';
import { POLICY_FIELDS } from '../types/policy_types.js';

const OPERATORS: PolicyOperator[] = ['<', '>', '<=', '>=', '==', '!='];

function isValidField(field: string): boolean {
  return POLICY_FIELDS.includes(field as (typeof POLICY_FIELDS)[number]);
}

function isValidOperator(op: string): op is PolicyOperator {
  return OPERATORS.includes(op as PolicyOperator);
}

/**
 * Parse action from THEN clause: action_name("param") or action_name().
 */
function parseAction(thenPart: string): PolicyAction {
  const trimmed = thenPart.trim();
  const match = trimmed.match(/^(\w+)\s*\(\s*\)\s*$/);
  if (match) {
    const type = match[1];
    if (
      type === 'block_feature' ||
      type === 'allow_feature' ||
      type === 'increase_audit_frequency' ||
      type === 'require_certification'
    ) {
      return Object.freeze({ type });
    }
  }
  const matchWithParam = trimmed.match(/^(\w+)\s*\(\s*["']([^"']+)["']\s*\)\s*$/);
  if (matchWithParam) {
    const type = matchWithParam[1];
    const paramValue = matchWithParam[2];
    if (type === 'block_feature' || type === 'allow_feature') {
      return Object.freeze({
        type: type as 'block_feature' | 'allow_feature',
        params: Object.freeze({ feature: paramValue }),
      });
    }
  }
  throw new Error(`Invalid THEN clause: ${thenPart}`);
}

/**
 * Parse policy DSL into GovernancePolicy. Generates id from content hash or description.
 */
export function parsePolicyDSL(dsl: string, id?: string): GovernancePolicy {
  const normalized = dsl.replace(/\r\n/g, '\n').trim();
  if (!normalized.includes('IF')) {
    throw new Error('DSL must contain IF');
  }
  if (!normalized.includes('THEN')) {
    throw new Error('DSL must contain THEN');
  }
  const [ifPart, thenPart] = normalized.split(/\s+THEN\s+/).map((s) => s.trim());
  const ifBody = ifPart.replace(/^\s*IF\s+/i, '').trim();
  const condMatch = ifBody.match(/^(\w+)\s+(<|>|<=|>=|==|!=)\s+(.+)$/);
  if (!condMatch) {
    throw new Error('Invalid IF condition format');
  }
  const field = condMatch[1];
  const operator = condMatch[2];
  let valueRaw = condMatch[3].trim();
  if (!isValidField(field)) {
    throw new Error(`Invalid field: ${field}`);
  }
  if (!isValidOperator(operator)) {
    throw new Error(`Invalid operator: ${operator}`);
  }
  let value: number | string;
  if (/^TIER_\d/i.test(valueRaw)) {
    value = valueRaw;
  } else {
    const num = Number(valueRaw);
    if (!Number.isFinite(num)) {
      value = valueRaw;
    } else {
      value = num;
    }
  }
  const condition: PolicyCondition = Object.freeze({ field, operator, value });
  const action = parseAction(thenPart);
  const policyId = id ?? `policy_${normalized.length}_${condition.field}_${String(value).slice(0, 20)}`;
  return Object.freeze({
    id: policyId,
    condition,
    action,
  });
}
