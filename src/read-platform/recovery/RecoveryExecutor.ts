/**
 * Recovery Executor - orchestra replay e recovery
 * Microstep 5.2.3
 *
 * Replay deterministico, idempotente, osservabile.
 */

import type { ReadDLQ, ReadDLQEntry } from '../dlq/ReadDLQ';
import type { MigrationProjectionExecutor } from '../migrations/ReadModelMigration';
import type { ReplayCommand } from './ReplayCommand';
import type { RecoveryResult } from './RecoveryResult';
import { createRecoveryResult } from './RecoveryResult';

function dlqEntryToReplayEvent(entry: ReadDLQEntry) {
  return {
    id: entry.eventId,
    type: entry.eventType,
    payload: entry.payload,
    timestamp: entry.timestamp ? new Date(entry.timestamp).toISOString() : undefined,
  };
}

export interface RecoveryExecutorOptions {
  dlq: ReadDLQ;
  projectionExecutor: MigrationProjectionExecutor;
  now?: () => number;
}

export class RecoveryExecutor {
  constructor(private readonly options: RecoveryExecutorOptions) {}

  async execute(command: ReplayCommand): Promise<RecoveryResult> {
    const now = this.options.now?.() ?? Date.now();
    const entries = await this.collectEntries(command);
    const attempted = entries.map((e) => e.eventId);
    const recovered: string[] = [];
    const failed: string[] = [];
    const errors: Record<string, string> = {};

    if (command.mode === 'DRY_RUN') {
      return createRecoveryResult(
        'DRY_RUN',
        attempted,
        [],
        [],
        {},
        now
      );
    }

    for (const entry of entries) {
      try {
        await this.options.projectionExecutor.apply(
          dlqEntryToReplayEvent(entry),
          command.targetVersion
        );
        recovered.push(entry.eventId);
        await this.options.dlq.remove(entry.eventId);
      } catch (err) {
        failed.push(entry.eventId);
        errors[entry.eventId] = err instanceof Error ? err.message : String(err);
      }
    }

    return createRecoveryResult(
      'EXECUTE',
      attempted,
      recovered,
      failed,
      errors,
      now
    );
  }

  private async collectEntries(command: ReplayCommand): Promise<ReadDLQEntry[]> {
    const prov = command.provenance;
    if (prov.source === 'DLQ') {
      const all = await this.options.dlq.getAll();
      if (prov.eventIds?.length) {
        return all.filter((e) => prov.eventIds!.includes(e.eventId));
      }
      return all;
    }
    if (prov.source === 'EVENT_IDS') {
      const entries: ReadDLQEntry[] = [];
      for (const id of prov.eventIds) {
        const e = await this.options.dlq.getByEventId(id);
        if (e) entries.push(e);
      }
      return entries;
    }
    if (prov.source === 'TIME_RANGE') {
      const all = await this.options.dlq.getAll();
      const to = prov.toTimestamp ?? Infinity;
      return all.filter(
        (e) => e.timestamp >= prov.fromTimestamp && e.timestamp <= to
      );
    }
    return [];
  }
}
