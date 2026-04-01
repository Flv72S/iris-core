/**
 * Thread Projection Handler — Event → Read Model (pure)
 * Trasforma un Thread Read Event in una rappresentazione del Read Model.
 * Nessun I/O, nessun side-effect, nessuna mutazione.
 */

import type {
  ThreadReadEvent,
  ThreadCreatedReadEvent,
  ThreadUpdatedReadEvent,
  ThreadArchivedReadEvent,
} from '../../read-events';

/** Read Model locale: solo campi necessari per il read side. */
interface ThreadReadModel {
  readonly id: string;
  readonly title?: string;
  readonly archived: boolean;
  readonly createdAt?: string;
  readonly updatedAt: string;
}

function fromCreated(event: ThreadCreatedReadEvent): ThreadReadModel {
  return {
    id: event.id,
    title: event.title,
    archived: event.archived,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

function fromUpdated(event: ThreadUpdatedReadEvent): ThreadReadModel {
  return {
    id: event.id,
    title: event.title,
    archived: event.archived,
    updatedAt: event.updatedAt,
  };
}

function fromArchived(event: ThreadArchivedReadEvent): ThreadReadModel {
  return {
    id: event.id,
    archived: event.archived,
    updatedAt: event.updatedAt,
  };
}

/**
 * Proietta un Thread Read Event nel Read Model risultante.
 * Funzione pura, deterministica, senza side-effect.
 */
export function projectThreadEvent(event: ThreadReadEvent): ThreadReadModel {
  switch (event.type) {
    case 'ThreadCreated':
      return fromCreated(event);
    case 'ThreadUpdated':
      return fromUpdated(event);
    case 'ThreadArchived':
      return fromArchived(event);
    default: {
      const _: never = event;
      return _;
    }
  }
}
