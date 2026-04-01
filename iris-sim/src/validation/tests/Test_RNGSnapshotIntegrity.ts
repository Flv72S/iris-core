import { DeterministicRNG } from '../../deterministic-rng/DeterministicRNG.js';

const SEED = 'rng-snapshot-integrity-seed';

function runTest_RNGSnapshotIntegrity(): void {
  const rng = new DeterministicRNG(SEED);
  for (let i = 0; i < 10; i++) rng.nextUint32();
  const snap = rng.snapshot();
  const after1: number[] = [];
  for (let i = 0; i < 10; i++) after1.push(rng.nextUint32());
  rng.restore(snap);
  const after2: number[] = [];
  for (let i = 0; i < 10; i++) after2.push(rng.nextUint32());
  for (let i = 0; i < 10; i++) {
    if (after1[i] !== after2[i]) throw new Error('RNG snapshot: mismatch at index ' + i);
  }
  const parsed = JSON.parse(JSON.stringify(snap)) as { s0: number; s1: number; callCount: number };
  const rng2 = new DeterministicRNG('other');
  rng2.restore(parsed);
  const nextRestore = rng2.nextUint32();
  const rng3 = new DeterministicRNG(SEED);
  for (let i = 0; i < 10; i++) rng3.nextUint32();
  const expected11th = rng3.nextUint32();
  if (nextRestore !== expected11th) throw new Error('RNG: restore after JSON roundtrip failed');
}

export { runTest_RNGSnapshotIntegrity };
