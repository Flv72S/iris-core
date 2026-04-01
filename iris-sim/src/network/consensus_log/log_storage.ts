import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ConsensusLogEntry } from './log_entry.js';
import { deserializeEntry, serializeEntry } from './log_serializer.js';
import { ConsensusLogIntegrityError, ConsensusLogIntegrityErrorCode } from './log_types.js';

export class LogStorage {
  constructor(private readonly filePath: string) {}

  append(entry: ConsensusLogEntry): void {
    try {
      const dir = dirname(this.filePath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      appendFileSync(this.filePath, serializeEntry(entry) + '\n', { encoding: 'utf8' });
    } catch (e) {
      throw new ConsensusLogIntegrityError(
        ConsensusLogIntegrityErrorCode.STORAGE_WRITE_FAILED,
        `Failed to append consensus log entry: ${(e as Error).message}`,
      );
    }
  }

  readAll(): ConsensusLogEntry[] {
    if (!existsSync(this.filePath)) return [];
    const raw = readFileSync(this.filePath, { encoding: 'utf8' });
    if (raw.trim().length === 0) return [];
    const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
    return lines.map((l) => deserializeEntry(l));
  }
}

