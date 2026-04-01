/**
 * Read Model Migration — orchestrazione migrazione e replay
 * Microstep 5.1.3 — Read Side Migration Strategy
 *
 * Indipendente da HTTP. Nessuna dipendenza da controller.
 * Compatibile con ProjectionWriteTarget.
 */

import type { MigrationState } from './MigrationState';
import {
  createIdleState,
  createRunningState,
  createCompletedState,
  createFailedState,
} from './MigrationState';
import type { MigrationStrategy } from './MigrationStrategy';

/** Evento read-side per replay (framework-agnostico). */
export interface ReplayEvent {
  readonly id: string;
  readonly type: string;
  readonly payload: unknown;
  readonly timestamp?: string;
}

/** Fornisce eventi per replay. */
export interface MigrationEventSource {
  getEvents(strategy: MigrationStrategy): AsyncIterable<ReplayEvent>;
}

/** Applica un evento alla projection verso una versione target. */
export interface MigrationProjectionExecutor {
  apply(event: ReplayEvent, targetVersion: string): Promise<void>;
}

/** Callback per target di scrittura (WRITE_ALL durante migrazione). */
export type OnWriteTargetChange = (target: 'WRITE_V1_ONLY' | 'WRITE_ALL') => void;

export interface ReadModelMigrationOptions {
  fromVersion?: string;
  toVersion?: string;
  eventSource: MigrationEventSource;
  projectionExecutor: MigrationProjectionExecutor;
  onWriteTargetChange?: OnWriteTargetChange;
  now?: () => number;
}

export class ReadModelMigration {
  private state: MigrationState;
  private stopped = false;
  private readonly options: ReadModelMigrationOptions;

  constructor(options: ReadModelMigrationOptions) {
    this.options = {
      fromVersion: 'v1',
      toVersion: 'v2',
      now: () => Date.now(),
      ...options,
    };
    this.state = createIdleState(
      this.options.fromVersion!,
      this.options.toVersion!
    );
  }

  getState(): MigrationState {
    return { ...this.state };
  }

  /** Avvia la migrazione. Stato → RUNNING, target → WRITE_ALL. */
  async start(strategy: MigrationStrategy): Promise<void> {
    if (this.state.status === 'RUNNING') return;
    this.stopped = false;
    const now = this.options.now!();
    this.state = createRunningState(this.state, 0, now);
    this.options.onWriteTargetChange?.('WRITE_ALL');

    try {
      const events: ReplayEvent[] = [];
      for await (const e of this.options.eventSource.getEvents(strategy)) {
        if (this.stopped) break;
        events.push(e);
      }

      const total = events.length;
      let processed = 0;
      for (const event of events) {
        if (this.stopped) break;
        await this.options.projectionExecutor.apply(
          event,
          this.options.toVersion!
        );
        processed++;
        const progress = total > 0 ? Math.round((processed / total) * 100) : 100;
        this.state = createRunningState(this.state, progress, now);
      }

      if (this.stopped) return;
      this.state = createCompletedState(this.state, this.options.now!());
      this.options.onWriteTargetChange?.('WRITE_ALL'); // v1 e v2 serviti senza downtime
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.state = createFailedState(
        this.state,
        error,
        this.options.now!()
      );
      this.options.onWriteTargetChange?.('WRITE_V1_ONLY');
      throw err;
    }
  }

  stop(): void {
    this.stopped = true;
  }
}
