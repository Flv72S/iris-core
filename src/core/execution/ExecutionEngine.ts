/**
 * Controlled Execution Engine
 *
 * Executes actions explicitly requested by feature pipelines.
 * This engine does not decide, learn, adapt or infer.
 * All execution is guarded, auditable and kill-switchable.
 */

import type { ExecutionAction } from './ExecutionAction';
import type { ExecutionResult } from './ExecutionResult';
import type { ExecutionContext } from './ExecutionContext';
import type { ExecutionGuardrail } from './guardrails/ExecutionGuardrail';
import type { ExecutionAdapter } from './adapters/ExecutionAdapter';
import { isExecutionEnabled } from './kill-switch/ExecutionKillSwitch';
import {
  EXECUTION_ENGINE_COMPONENT_ID,
  SEND_NOTIFICATION_COMPONENT_ID,
  SCHEDULE_EVENT_COMPONENT_ID,
  BLOCK_INPUT_COMPONENT_ID,
  DEFER_MESSAGE_COMPONENT_ID,
} from './kill-switch/ExecutionKillSwitch';
import { appendAudit } from './audit/ExecutionAuditLog';
import type { ExecutionActionType } from './ExecutionAction';

const ACTION_TYPE_TO_COMPONENT_ID: Record<ExecutionActionType, string> = {
  SEND_NOTIFICATION: SEND_NOTIFICATION_COMPONENT_ID,
  SCHEDULE_EVENT: SCHEDULE_EVENT_COMPONENT_ID,
  BLOCK_INPUT: BLOCK_INPUT_COMPONENT_ID,
  DEFER_MESSAGE: DEFER_MESSAGE_COMPONENT_ID,
};

export class ExecutionEngine {
  private readonly guardrails: readonly ExecutionGuardrail[];
  private readonly adaptersByType: Readonly<Record<ExecutionActionType, ExecutionAdapter>>;

  constructor(
    guardrails: readonly ExecutionGuardrail[],
    adapters: readonly ExecutionAdapter[]
  ) {
    this.guardrails = guardrails;
    const map: Record<ExecutionActionType, ExecutionAdapter> = {} as Record<
      ExecutionActionType,
      ExecutionAdapter
    >;
    for (const a of adapters) {
      map[a.actionType] = a;
    }
    this.adaptersByType = Object.freeze(map);
  }

  execute(action: ExecutionAction, context: ExecutionContext): ExecutionResult {
    const registry = context.registry;

    if (!isExecutionEnabled(registry, EXECUTION_ENGINE_COMPONENT_ID)) {
      const result: ExecutionResult = Object.freeze({
        status: 'BLOCKED',
        reason: 'Execution engine disabled',
      });
      appendAudit(
        Object.freeze({
          actionId: action.id,
          type: action.type,
          sourceFeature: action.sourceFeature,
          requestedAt: action.requestedAt,
          result,
        })
      );
      return result;
    }

    const componentId = ACTION_TYPE_TO_COMPONENT_ID[action.type];
    if (!isExecutionEnabled(registry, componentId)) {
      const result: ExecutionResult = Object.freeze({
        status: 'BLOCKED',
        reason: `Action type ${action.type} disabled`,
      });
      appendAudit(
        Object.freeze({
          actionId: action.id,
          type: action.type,
          sourceFeature: action.sourceFeature,
          requestedAt: action.requestedAt,
          result,
        })
      );
      return result;
    }

    for (const guardrail of this.guardrails) {
      const guardResult = guardrail.check(action, context);
      if (guardResult !== null) {
        appendAudit(
          Object.freeze({
            actionId: action.id,
            type: action.type,
            sourceFeature: action.sourceFeature,
            requestedAt: action.requestedAt,
            result: guardResult,
          })
        );
        return guardResult;
      }
    }

    const adapter = this.adaptersByType[action.type];
    const result = adapter
      ? adapter.execute(action, context.now)
      : (Object.freeze({
          status: 'BLOCKED' as const,
          reason: `No adapter for ${action.type}`,
        }) as ExecutionResult);

    appendAudit(
      Object.freeze({
        actionId: action.id,
        type: action.type,
        sourceFeature: action.sourceFeature,
        requestedAt: action.requestedAt,
        result,
      })
    );
    return result;
  }
}
