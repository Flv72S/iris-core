/**
 * SignalAdapterKillSwitch — Adapter OFF → restituisce [].
 * Registry standard: componentId → boolean.
 */

export const CALENDAR_SIGNAL_ADAPTER_COMPONENT_ID = 'signal-adapter-calendar';
export const TASKS_SIGNAL_ADAPTER_COMPONENT_ID = 'signal-adapter-tasks';
export const INBOX_SIGNAL_ADAPTER_COMPONENT_ID = 'signal-adapter-inbox';
export const TIME_SIGNAL_ADAPTER_COMPONENT_ID = 'signal-adapter-time';
export const ACTIVITY_SIGNAL_ADAPTER_COMPONENT_ID = 'signal-adapter-activity';

export type SignalAdapterRegistry = Record<string, boolean>;

export function isSignalAdapterEnabled(
  registry: SignalAdapterRegistry,
  componentId: string
): boolean {
  return registry[componentId] !== false;
}
