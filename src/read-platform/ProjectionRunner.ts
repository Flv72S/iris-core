/**
 * Projection Runner — motore asincrono per processare Read Events
 * Riceve dalla queue, invoca gli handler, gestisce ordering, retry e idempotency basilare.
 * Non persiste, non fa I/O esterno, non conosce DB o cache.
 */

import type { ThreadReadEvent, MessageReadEvent } from '../core/read-events';
import type { ReadEvent } from './InMemoryProjectionQueue';

export interface ProjectionQueue {
  dequeue(): ReadEvent | undefined;
  size(): number;
}

export interface ProjectionHandlers {
  projectThreadEvent: (event: ThreadReadEvent) => unknown;
  projectMessageEvent: (event: MessageReadEvent) => unknown;
}

const DEFAULT_MAX_RETRIES = 2;

function isThreadEvent(event: ReadEvent): event is ThreadReadEvent {
  return (
    event.type === 'ThreadCreated' ||
    event.type === 'ThreadUpdated' ||
    event.type === 'ThreadArchived'
  );
}

function getIdempotencyKey(event: ReadEvent): string {
  return `${event.type}:${event.id}`;
}

/**
 * Runner asincrono: preleva dalla queue, applica gli handler, rispetta ordering e idempotency.
 */
export class ProjectionRunner {
  private stopped = true;
  private readonly processedKeys = new Set<string>();
  private readonly maxRetries: number;

  constructor(
    private readonly queue: ProjectionQueue,
    private readonly handlers: ProjectionHandlers,
    options?: { maxRetries?: number }
  ) {
    this.maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  start(): void {
    this.stopped = false;
    this.runLoop();
  }

  stop(): void {
    this.stopped = true;
  }

  /** Processa un singolo evento dalla queue (per test o chiamata esplicita). */
  async processNext(): Promise<boolean> {
    const event = this.queue.dequeue();
    if (event === undefined) return false;

    const key = getIdempotencyKey(event);
    if (this.processedKeys.has(key)) return true;

    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (isThreadEvent(event)) {
          this.handlers.projectThreadEvent(event);
        } else {
          this.handlers.projectMessageEvent(event);
        }
        this.processedKeys.add(key);
        return true;
      } catch (err) {
        lastError = err;
      }
    }
    return true;
  }

  private async runLoop(): Promise<void> {
    while (!this.stopped) {
      const hadWork = await this.processNext();
      if (!hadWork && this.queue.size() === 0) {
        await new Promise((r) => setTimeout(r, 10));
      }
    }
  }
}
