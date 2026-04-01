/**
 * Domain events — Blocco 6.1.1 / 6.1.2 / 6.1.3
 * Export centralizzato; nessuna logica.
 */

export type { DomainEvent, DomainEventMetadata } from './DomainEvent';
export type { DomainEventCollector } from './EventCollector';
export { NoOpEventCollector } from './EventCollector';
export { DispatchingEventCollector } from './DispatchingEventCollector';
export type { DomainEventListener } from './DomainEventListener';
export {
  InProcessEventDispatcher,
  type DispatcherDebugLog,
  type InProcessEventDispatcherOptions,
} from './InProcessEventDispatcher';
export type { DomainEventStore } from './DomainEventStore';
export { InMemoryEventStore, type InMemoryEventStoreOptions } from './InMemoryEventStore';
export { NoOpEventStore } from './NoOpEventStore';
export { EventStoreListener } from './EventStoreListener';
export { MessageSent } from './MessageSent';
export type { MessageSentPayload } from './MessageSent';
export { MessageEdited } from './MessageEdited';
export type { MessageEditedPayload } from './MessageEdited';
export { ThreadCreated } from './ThreadCreated';
export type { ThreadCreatedPayload } from './ThreadCreated';
export { ReplyAdded } from './ReplyAdded';
export type { ReplyAddedPayload } from './ReplyAdded';
export { ThreadArchived } from './ThreadArchived';
export type { ThreadArchivedPayload } from './ThreadArchived';
export { UserInactive } from './UserInactive';
export type { UserInactivePayload } from './UserInactive';
