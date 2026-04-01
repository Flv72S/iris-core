/**
 * Phase 13K — Governance Automation Engine.
 * Converts TrustPipelineResult governance_events into execution-ready governance operations.
 */

import type { GovernanceAutomationInput } from './governance_automation_types.js';
import type { GovernanceOperation } from './governance_automation_types.js';
import type { TrustGovernanceEvent } from '../trust_governance_bridge/index.js';
import type {
  GovernanceAutomationResult,
  GovernanceExecutionRequest,
} from './governance_automation_result.js';
import { buildGovernanceOperation } from './governance_operation_builder.js';

export const MAX_OPERATIONS_PER_CYCLE = 50;

export interface GovernanceAutomationOptions {
  readonly debug?: boolean;
}

function log(debug: boolean, msg: string): void {
  if (debug) {
    // eslint-disable-next-line no-console
    console.debug(`[GovernanceAutomation] ${msg}`);
  }
}

/**
 * Sort operations by severity DESC, timestamp ASC, target_node ASC. Deterministic.
 */
function sortOperations(ops: GovernanceOperation[]): GovernanceOperation[] {
  return [...ops].sort((a, b) => {
    if (b.severity !== a.severity) return b.severity - a.severity;
    if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
    return a.target_node.localeCompare(b.target_node);
  });
}

/**
 * Run governance automation: convert pipeline trust events into validated operations
 * and execution-ready requests. Deterministic; no randomness or system clock.
 */
export function runGovernanceAutomation(
  input: GovernanceAutomationInput,
  options: GovernanceAutomationOptions = {}
): GovernanceAutomationResult {
  const { debug = false } = options;
  const pipeline_result = input.pipeline_result;
  const timestamp = pipeline_result.timestamp;
  const events = pipeline_result.governance_events;

  log(debug, `Processing ${events.length} governance events`);

  const generated_operations: GovernanceOperation[] = [];
  const rejected_events: TrustGovernanceEvent[] = [];

  for (const event of events) {
    const operation = buildGovernanceOperation(event);
    if (operation !== null) {
      generated_operations.push(operation);
    } else {
      rejected_events.push(event);
    }
  }

  log(debug, `Generated ${generated_operations.length} operations, rejected ${rejected_events.length} events`);

  const sorted = sortOperations(generated_operations);
  const capped = sorted.slice(0, MAX_OPERATIONS_PER_CYCLE);
  const execution_ready_operations: GovernanceExecutionRequest[] = capped.map((op) =>
    Object.freeze({
      operation_id: op.operation_id,
      payload: op,
    })
  );

  if (sorted.length > MAX_OPERATIONS_PER_CYCLE) {
    log(debug, `Capped at ${MAX_OPERATIONS_PER_CYCLE}; ${sorted.length - MAX_OPERATIONS_PER_CYCLE} operations excluded`);
  }

  return Object.freeze({
    timestamp,
    generated_operations: sorted,
    rejected_events,
    execution_ready_operations,
  });
}
