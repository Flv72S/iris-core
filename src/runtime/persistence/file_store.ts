import { mkdir, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { canonicalizeKeysDeep, stableStringify } from '../../logging/audit';
import type { ComplianceDecision } from '../../distributed/cluster_compliance_engine';
import type { ClusterState } from '../../distributed/cluster_lifecycle_engine';
import { writeFileAtomic } from './atomic_writer';

interface VersionedSnapshot<T> {
  readonly version: 1;
  readonly payload: T;
}

export interface StoredDecision {
  readonly decisionId: string;
  readonly decision: ComplianceDecision;
  readonly executionTimestamp: number;
}

export interface PersistentStorage {
  readonly journal: readonly StoredDecision[];
  readonly snapshot: ClusterState;
  readonly snapshotVersion: number;
}

const SNAPSHOT_FILE = 'runtime_snapshot.json';
const JOURNAL_DIR = 'journal';

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export class RuntimeFileStore {
  constructor(private readonly rootPath: string) {}

  private snapshotPath(): string {
    return join(this.rootPath, SNAPSHOT_FILE);
  }

  private journalDirPath(): string {
    return join(this.rootPath, JOURNAL_DIR);
  }

  async loadSnapshot(): Promise<{ snapshot: ClusterState; snapshotVersion: number } | undefined> {
    try {
      const raw = await readFile(this.snapshotPath(), 'utf8');
      const parsed = JSON.parse(raw) as VersionedSnapshot<{ snapshot: ClusterState; snapshotVersion: number }>;
      return deepClone(parsed.payload);
    } catch {
      return undefined;
    }
  }

  async writeSnapshot(snapshot: ClusterState, snapshotVersion: number): Promise<void> {
    await mkdir(this.rootPath, { recursive: true });
    const body: VersionedSnapshot<{ snapshot: ClusterState; snapshotVersion: number }> = {
      version: 1,
      payload: { snapshot: deepClone(snapshot), snapshotVersion },
    };
    await writeFileAtomic(this.snapshotPath(), stableStringify(canonicalizeKeysDeep(body)));
  }

  async appendJournal(entry: StoredDecision): Promise<number> {
    const journal = await this.readJournal();
    const nextIndex = journal.length + 1;
    await mkdir(this.journalDirPath(), { recursive: true });
    const filename = `${String(nextIndex).padStart(12, '0')}.json`;
    const payload = stableStringify(canonicalizeKeysDeep(deepClone(entry)));
    await writeFileAtomic(join(this.journalDirPath(), filename), payload);
    return nextIndex;
  }

  async readJournal(): Promise<readonly StoredDecision[]> {
    try {
      const files = (await readdir(this.journalDirPath()))
        .filter((x) => x.endsWith('.json'))
        .sort();
      const out: StoredDecision[] = [];
      const seen = new Set<string>();
      for (const f of files) {
        try {
          const raw = await readFile(join(this.journalDirPath(), f), 'utf8');
          const parsed = JSON.parse(raw) as StoredDecision;
          if (typeof parsed.decisionId !== 'string' || parsed.decisionId.length === 0) continue;
          if (seen.has(parsed.decisionId)) continue;
          seen.add(parsed.decisionId);
          out.push(deepClone(parsed));
        } catch {
          // skip invalid/truncated entry and continue recovery
        }
      }
      return Object.freeze(out);
    } catch {
      return Object.freeze([]);
    }
  }
}
