/**
 * Read DLQ - Dead Letter Queue per Read Side
 * Microstep 5.2.2
 *
 * Conserva eventi non processabili. Storage-agnostic.
 */

export type DLQContext = 'live' | 'replay' | 'migration';

export interface ReadDLQEntry {
  readonly eventId: string;
  readonly eventType: string;
  readonly payload: unknown;
  readonly targetVersion: string;
  readonly errorMessage: string;
  readonly errorStack?: string;
  readonly timestamp: number;
  readonly context: DLQContext;
}

export interface ReadDLQ {
  enqueue(entry: ReadDLQEntry): Promise<void>;
  getAll(): Promise<ReadDLQEntry[]>;
  getByEventId(eventId: string): Promise<ReadDLQEntry | undefined>;
  remove(eventId: string): Promise<void>;
}
