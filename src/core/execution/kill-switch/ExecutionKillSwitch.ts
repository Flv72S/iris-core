/**
 * Execution Kill Switch — OFF blocca execution. Registry per componente.
 */

export const EXECUTION_ENGINE_COMPONENT_ID = 'EXECUTION_ENGINE';
export const SEND_NOTIFICATION_COMPONENT_ID = 'SEND_NOTIFICATION';
export const SCHEDULE_EVENT_COMPONENT_ID = 'SCHEDULE_EVENT';
export const BLOCK_INPUT_COMPONENT_ID = 'BLOCK_INPUT';
export const DEFER_MESSAGE_COMPONENT_ID = 'DEFER_MESSAGE';

export type ExecutionKillSwitchRegistry = Record<string, boolean>;

export function isExecutionEnabled(
  registry: ExecutionKillSwitchRegistry,
  componentId: string
): boolean {
  return registry[componentId] !== false;
}
