import { join } from 'node:path';

import type { ComplianceDecision } from '../../distributed/cluster_compliance_engine';
import type { ClusterState } from '../../distributed/cluster_lifecycle_engine';
import { RuntimeFileStore, type PersistentStorage, type StoredDecision } from './file_store';

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export class StorageEngine {
  private readonly store: RuntimeFileStore;

  constructor(storagePath: string) {
    this.store = new RuntimeFileStore(join(storagePath, 'state'));
  }

  async load(initialState: ClusterState): Promise<PersistentStorage> {
    const journal = await this.store.readJournal();
    const snapshotData = await this.store.loadSnapshot();
    if (snapshotData === undefined) {
      return Object.freeze({
        journal,
        snapshot: deepClone(initialState),
        snapshotVersion: 0,
      });
    }
    return Object.freeze({
      journal,
      snapshot: deepClone(snapshotData.snapshot),
      snapshotVersion: Math.min(snapshotData.snapshotVersion, journal.length),
    });
  }

  async appendDecision(entry: StoredDecision): Promise<number> {
    return this.store.appendJournal(entry);
  }

  async writeSnapshot(snapshot: ClusterState, snapshotVersion: number): Promise<void> {
    await this.store.writeSnapshot(snapshot, snapshotVersion);
  }

  async persistLegacyState(snapshot: ClusterState, _decision?: ComplianceDecision): Promise<void> {
    // keep compatibility for remote merges: snapshot is optimization only
    const data = await this.load(snapshot);
    await this.writeSnapshot(snapshot, data.journal.length);
  }
}
