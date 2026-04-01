/**
 * Behavioral Snapshot — Livello 1 (6.2.2)
 *
 * Strato derivato minimale sopra Livello 0.
 * Shadow, non decisionale, non UX. Nessuna dipendenza inversa su L0.
 */

export type { ThreadSnapshotL0, UserSnapshotL0, ChatTypeL0 } from './level0-types';
export type { BehavioralSnapshotL0Reader } from './level0-reader';
export { InMemoryBehavioralSnapshotL0Reader } from './in-memory-l0-reader';
export type { ThreadSnapshotL1, UserSnapshotL1 } from './level1-types';
export type { BehavioralSnapshotL1Store } from './level1-store';
export { InMemoryBehavioralSnapshotL1Store, NoOpBehavioralSnapshotL1Store } from './level1-store';
export {
  SnapshotDeriverLevel1,
  type SnapshotDeriverLevel1Options,
} from './level1-deriver';
