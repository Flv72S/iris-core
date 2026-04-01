/**
 * Message Projection Handler — Event → Read Model (pure)
 * Trasforma un Message Read Event in una rappresentazione del Read Model.
 * Nessun I/O, nessun side-effect, nessuna mutazione.
 */

import type {
  MessageReadEvent,
  MessageAddedReadEvent,
  MessageUpdatedReadEvent,
  MessageRemovedReadEvent,
} from '../../read-events';

/** Read Model locale: solo campi necessari per il read side. */
interface MessageReadModel {
  readonly id: string;
  readonly threadId: string;
  readonly author?: string;
  readonly content?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly removed?: boolean;
}

function fromAdded(event: MessageAddedReadEvent): MessageReadModel {
  return {
    id: event.id,
    threadId: event.threadId,
    author: event.author,
    content: event.content,
    createdAt: event.createdAt,
  };
}

function fromUpdated(event: MessageUpdatedReadEvent): MessageReadModel {
  return {
    id: event.id,
    threadId: event.threadId,
    content: event.content,
    updatedAt: event.updatedAt,
  };
}

function fromRemoved(event: MessageRemovedReadEvent): MessageReadModel {
  return {
    id: event.id,
    threadId: event.threadId,
    removed: true,
  };
}

/**
 * Proietta un Message Read Event nel Read Model risultante.
 * Funzione pura, deterministica, senza side-effect.
 */
export function projectMessageEvent(event: MessageReadEvent): MessageReadModel {
  switch (event.type) {
    case 'MessageAdded':
      return fromAdded(event);
    case 'MessageUpdated':
      return fromUpdated(event);
    case 'MessageRemoved':
      return fromRemoved(event);
    default: {
      const _: never = event;
      return _;
    }
  }
}
