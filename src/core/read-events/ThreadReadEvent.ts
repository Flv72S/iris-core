/**
 * Read Event Contracts — Thread
 * Eventi derivati per il read side; non Domain Events.
 * Solo primitive, serializzabili, versionati.
 */

export const THREAD_READ_EVENT_VERSION = 'v1' as const;

/** Thread creato (read model da aggiornare) */
export interface ThreadCreatedReadEvent {
  readonly type: 'ThreadCreated';
  readonly eventName: 'ThreadCreated';
  readonly eventVersion: typeof THREAD_READ_EVENT_VERSION;
  readonly id: string;
  readonly title: string;
  readonly archived: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Thread aggiornato (titolo / stato) */
export interface ThreadUpdatedReadEvent {
  readonly type: 'ThreadUpdated';
  readonly eventName: 'ThreadUpdated';
  readonly eventVersion: typeof THREAD_READ_EVENT_VERSION;
  readonly id: string;
  readonly title: string;
  readonly archived: boolean;
  readonly updatedAt: string;
}

/** Thread archiviato */
export interface ThreadArchivedReadEvent {
  readonly type: 'ThreadArchived';
  readonly eventName: 'ThreadArchived';
  readonly eventVersion: typeof THREAD_READ_EVENT_VERSION;
  readonly id: string;
  readonly archived: true;
  readonly updatedAt: string;
}

export type ThreadReadEvent =
  | ThreadCreatedReadEvent
  | ThreadUpdatedReadEvent
  | ThreadArchivedReadEvent;
