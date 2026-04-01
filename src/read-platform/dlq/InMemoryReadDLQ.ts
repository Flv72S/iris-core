/**
 * InMemory Read DLQ - implementazione in-memory
 * Microstep 5.2.2
 *
 * Per test, sviluppo, bootstrap. Nessuna persistenza reale.
 */

import type { ReadDLQ, ReadDLQEntry } from './ReadDLQ';

export class InMemoryReadDLQ implements ReadDLQ {
  private readonly entries = new Map<string, ReadDLQEntry>();

  async enqueue(entry: ReadDLQEntry): Promise<void> {
    this.entries.set(entry.eventId, entry);
  }

  async getAll(): Promise<ReadDLQEntry[]> {
    return [...this.entries.values()];
  }

  async getByEventId(eventId: string): Promise<ReadDLQEntry | undefined> {
    return this.entries.get(eventId);
  }

  async remove(eventId: string): Promise<void> {
    this.entries.delete(eventId);
  }
}
