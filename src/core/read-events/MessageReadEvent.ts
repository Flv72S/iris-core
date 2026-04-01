/**
 * Read Event Contracts — Message
 * Eventi derivati per il read side; non Domain Events.
 * Solo primitive, serializzabili, versionati.
 */

export const MESSAGE_READ_EVENT_VERSION = 'v1' as const;

/** Messaggio aggiunto a thread (read model da aggiornare) */
export interface MessageAddedReadEvent {
  readonly type: 'MessageAdded';
  readonly eventName: 'MessageAdded';
  readonly eventVersion: typeof MESSAGE_READ_EVENT_VERSION;
  readonly id: string;
  readonly threadId: string;
  readonly author: string;
  readonly content: string;
  readonly createdAt: string;
}

/** Messaggio aggiornato (contenuto) */
export interface MessageUpdatedReadEvent {
  readonly type: 'MessageUpdated';
  readonly eventName: 'MessageUpdated';
  readonly eventVersion: typeof MESSAGE_READ_EVENT_VERSION;
  readonly id: string;
  readonly threadId: string;
  readonly content: string;
  readonly updatedAt: string;
}

/** Messaggio rimosso */
export interface MessageRemovedReadEvent {
  readonly type: 'MessageRemoved';
  readonly eventName: 'MessageRemoved';
  readonly eventVersion: typeof MESSAGE_READ_EVENT_VERSION;
  readonly id: string;
  readonly threadId: string;
}

export type MessageReadEvent =
  | MessageAddedReadEvent
  | MessageUpdatedReadEvent
  | MessageRemovedReadEvent;
