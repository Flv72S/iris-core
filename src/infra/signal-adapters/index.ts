/**
 * Signal Adapters — Layer read-only per segnali da sorgenti esterne.
 * Infra-only: IRIS Core può importare da qui; UX/Product NON importano da qui.
 */

export type { SignalEvent, SignalSource } from './SignalEvent';
export type { SignalAdapter } from './SignalAdapter';
export { SignalAdapterRegistry } from './SignalAdapterRegistry';
export {
  CALENDAR_SIGNAL_ADAPTER_COMPONENT_ID,
  TASKS_SIGNAL_ADAPTER_COMPONENT_ID,
  INBOX_SIGNAL_ADAPTER_COMPONENT_ID,
  TIME_SIGNAL_ADAPTER_COMPONENT_ID,
  ACTIVITY_SIGNAL_ADAPTER_COMPONENT_ID,
  isSignalAdapterEnabled,
} from './SignalAdapterKillSwitch';
export type { SignalAdapterRegistry as SignalAdapterKillSwitchRegistry } from './SignalAdapterKillSwitch';
export { calendarSignalAdapter } from './calendar/CalendarSignalAdapter';
export { taskSignalAdapter } from './tasks/TaskSignalAdapter';
export { inboxSignalAdapter } from './inbox/InboxSignalAdapter';
export { timeSignalAdapter } from './time/TimeSignalAdapter';
export { activitySignalAdapter } from './activity/ActivitySignalAdapter';
