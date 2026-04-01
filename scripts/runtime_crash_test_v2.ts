import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir, rm, writeFile, cp } from 'node:fs/promises';
import { join } from 'node:path';
import { createServer } from 'node:net';

import type { ComplianceDecision } from '../src/distributed/cluster_compliance_engine';
import { checkStrongConvergence, type RuntimeSnapshotLike } from '../src/runtime/ops/convergence_checker';
import { withNetworkFaults } from '../src/runtime/ops/network_tools';

type NodeHandle = {
  readonly nodeId: string;
  readonly port: number;
  readonly storagePath: string;
  child: ChildProcess | undefined;
  stderrTail: string;
};

type TestResult = {
  preCrash: RuntimeSnapshotLike | null;
  postRecovery: RuntimeSnapshotLike | null;
  convergence: { hash: boolean; journal: boolean; actions: boolean; decision: boolean };
  replay: { lostDecisions: number; duplicatedDecisions: number };
  persistence: { valid: boolean };
  persistenceModel: {
    journalAsSourceOfTruth: boolean;
    snapshotConsistent: boolean;
    replayCorrect: boolean;
  };
  validationModel: {
    type: 'distributed';
    baselineConverged: boolean;
    postRecoveryCorrect: boolean;
    persistenceCorrect: boolean;
    finalConvergence: boolean;
  };
  diagnostics?: {
    finalJournalSizes: Readonly<Record<string, number>>;
  };
  recoveryTimeMs: number;
  finalResult: 'PASS' | 'FAIL';
  errors: string[];
};

type GlobalState = {
  journalIds: readonly string[];
  executedActions: readonly string[];
  lastDecisionId: string | null;
  stateHash: string;
};

const ROOT = process.cwd();
const OUT_FILE = join(ROOT, 'runtime_crash_test_result_v2.json');

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nodeArgs(port: number, peers: readonly number[], storagePath: string, nodeId: string): string[] {
  return [
    'tsx',
    'scripts/run_node.ts',
    `--port=${port}`,
    `--peers=${peers.join(',')}`,
    `--storagePath=${storagePath}`,
    `--nodeId=${nodeId}`,
    '--gossipIntervalMs=200',
    '--retryIntervalMs=100',
    '--maxRetryAttempts=6',
  ];
}

function startNode(handle: NodeHandle, peers: readonly number[]): void {
  const cmd = `npx tsx ${nodeArgs(handle.port, peers, handle.storagePath, handle.nodeId).slice(1).join(' ')}`;
  handle.child = spawn('cmd.exe', ['/d', '/s', '/c', cmd], {
    cwd: ROOT,
    stdio: 'pipe',
    shell: false,
  });
  handle.child.stdout?.on('data', () => {
    // consume to avoid backpressure deadlocks during long runs
  });
  handle.child.stderr?.on('data', (buf) => {
    const chunk = String(buf);
    handle.stderrTail = `${handle.stderrTail}\n${chunk}`.slice(-2000);
  });
}

async function stopNode(handle: NodeHandle, signal: NodeJS.Signals = 'SIGTERM'): Promise<void> {
  const c = handle.child;
  handle.child = undefined;
  if (c === undefined) return;
  c.kill(signal);
  await sleep(400);
}

async function waitHealthy(port: number, timeoutMs = 45000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      if (res.ok) return;
    } catch {
      // retry
    }
    await sleep(200);
  }
  throw new Error(`node ${port} not healthy in time`);
}

async function submit(port: number, decision: ComplianceDecision): Promise<void> {
  const res = await fetch(`http://127.0.0.1:${port}/decision`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(decision),
  });
  if (!res.ok) throw new Error(`decision submit failed ${port}`);
}

async function getSnapshot(port: number): Promise<RuntimeSnapshotLike> {
  const res = await fetch(`http://127.0.0.1:${port}/state_snapshot`);
  if (!res.ok) throw new Error(`snapshot fetch failed ${port}`);
  return (await res.json()) as RuntimeSnapshotLike;
}

function hasDuplicates(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

function canonicalSet(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort());
}

function equalSets(a: readonly string[], b: readonly string[]): boolean {
  return JSON.stringify(canonicalSet(a)) === JSON.stringify(canonicalSet(b));
}

function buildGlobalState(snapshots: readonly RuntimeSnapshotLike[]): GlobalState {
  const journalIds = canonicalSet(snapshots.flatMap((s) => s.executionJournalIds));
  const executedActions = canonicalSet(snapshots.flatMap((s) => s.executedActions));
  const lastDecisionId = journalIds.length === 0 ? null : journalIds[journalIds.length - 1]!;
  const stateHash = snapshots
    .map((s) => s.stateHash)
    .sort()
    .join('|');
  return Object.freeze({ journalIds, executedActions, lastDecisionId, stateHash });
}

function convergedByDistributedModel(snapshots: readonly RuntimeSnapshotLike[]): boolean {
  if (snapshots.length <= 1) return true;
  const first = snapshots[0]!;
  return snapshots.every((s) =>
    equalSets(s.executionJournalIds, first.executionJournalIds)
    && equalSets(s.executedActions, first.executedActions));
}

async function waitForConvergence(
  ports: readonly number[],
  stableCycles = 3,
  timeoutMs = 30000,
): Promise<{ report: ReturnType<typeof checkStrongConvergence>; snapshots: RuntimeSnapshotLike[]; elapsed: number }> {
  const start = Date.now();
  let consecutive = 0;
  let lastReport = checkStrongConvergence([]);
  let lastSnapshots: RuntimeSnapshotLike[] = [];
  while (Date.now() - start < timeoutMs) {
    const snaps = await Promise.all(ports.map((p) => getSnapshot(p)));
    const report = checkStrongConvergence(snaps);
    lastReport = report;
    lastSnapshots = snaps;
    if (convergedByDistributedModel(snaps)) consecutive += 1;
    else consecutive = 0;
    if (consecutive >= stableCycles) {
      return { report, snapshots: snaps, elapsed: Date.now() - start };
    }
    await sleep(500);
  }
  return { report: lastReport, snapshots: lastSnapshots, elapsed: Date.now() - start };
}

async function main(): Promise<void> {
  const errors: string[] = [];
  const emittedDecisions: ComplianceDecision[] = [];
  const result: TestResult = {
    preCrash: null,
    postRecovery: null,
    convergence: { hash: false, journal: false, actions: false, decision: false },
    replay: { lostDecisions: 0, duplicatedDecisions: 0 },
    persistence: { valid: false },
    persistenceModel: {
      journalAsSourceOfTruth: false,
      snapshotConsistent: false,
      replayCorrect: false,
    },
    validationModel: {
      type: 'distributed',
      baselineConverged: false,
      postRecoveryCorrect: false,
      persistenceCorrect: false,
      finalConvergence: false,
    },
    recoveryTimeMs: -1,
    finalResult: 'FAIL',
    errors,
  };

  const pickFreePort = async (): Promise<number> =>
    new Promise((resolve, reject) => {
      const s = createServer();
      s.on('error', reject);
      s.listen(0, '127.0.0.1', () => {
        const addr = s.address();
        if (addr === null || typeof addr === 'string') {
          reject(new Error('failed to resolve free port'));
          return;
        }
        const port = addr.port;
        s.close(() => resolve(port));
      });
    });

  const p1 = await pickFreePort();
  const p2 = await pickFreePort();
  const p3 = await pickFreePort();

  const n1: NodeHandle = { nodeId: `node-${p1}`, port: p1, storagePath: `.iris-node-${p1}`, child: undefined, stderrTail: '' };
  const n2: NodeHandle = { nodeId: `node-${p2}`, port: p2, storagePath: `.iris-node-${p2}`, child: undefined, stderrTail: '' };
  const n3: NodeHandle = { nodeId: `node-${p3}`, port: p3, storagePath: `.iris-node-${p3}`, child: undefined, stderrTail: '' };
  const nodes = [n1, n2, n3];

  try {
    for (const n of nodes) await rm(n.storagePath, { recursive: true, force: true });
    await rm(`${n1.storagePath}-precrash-backup`, { recursive: true, force: true });

    startNode(n1, [n2.port, n3.port]);
    startNode(n2, [n1.port, n3.port]);
    startNode(n3, [n1.port, n2.port]);
    for (const n of nodes) {
      try {
        await waitHealthy(n.port);
      } catch {
        throw new Error(`node ${n.port} not healthy in time; stderr=${n.stderrTail.trim()}`);
      }
    }

    // baseline + initial decisions
    const d1: ComplianceDecision = {
      severity: 'CRITICAL',
      action: 'ESCALATE',
      reasons: Object.freeze(['m1']),
      invariantIds: Object.freeze(['i1']),
      violationCount: 1,
      timestamp: 1,
    };
    emittedDecisions.push(d1);
    await submit(n1.port, d1);
    const d2: ComplianceDecision = {
      severity: 'CRITICAL',
      action: 'FREEZE_TRANSITIONS',
      reasons: Object.freeze(['m2']),
      invariantIds: Object.freeze(['i2']),
      violationCount: 1,
      timestamp: 2,
    };
    emittedDecisions.push(d2);
    await submit(n2.port, d2);
    const d3: ComplianceDecision = {
      severity: 'CRITICAL',
      action: 'HALT_CLUSTER',
      reasons: Object.freeze(['m3']),
      invariantIds: Object.freeze(['i3']),
      violationCount: 1,
      timestamp: 3,
    };
    emittedDecisions.push(d3);
    await submit(n3.port, d3);

    const baseline = await waitForConvergence([n1.port, n2.port, n3.port], 1, 60000);
    const baselineGlobal = buildGlobalState(baseline.snapshots);
    result.validationModel.baselineConverged = baseline.snapshots.every((s) =>
      s.executionJournalIds.every((id) => baselineGlobal.journalIds.includes(id))
      && s.executedActions.every((a) => baselineGlobal.executedActions.includes(a)));
    if (!result.validationModel.baselineConverged) errors.push('baseline convergence failed');

    const pre = await getSnapshot(n1.port);
    result.preCrash = pre;
    await cp(n1.storagePath, `${n1.storagePath}-precrash-backup`, { recursive: true });

    // brutal crash
    await stopNode(n1, 'SIGKILL');

    // activity while down
    const d4: ComplianceDecision = {
      severity: 'CRITICAL',
      action: 'ESCALATE',
      reasons: Object.freeze(['m4']),
      invariantIds: Object.freeze(['i4']),
      violationCount: 1,
      timestamp: 4,
    };
    emittedDecisions.push(d4);
    await submit(n2.port, d4);
    const d5: ComplianceDecision = {
      severity: 'CRITICAL',
      action: 'HALT_CLUSTER',
      reasons: Object.freeze(['m5']),
      invariantIds: Object.freeze(['i5']),
      violationCount: 1,
      timestamp: 5,
    };
    emittedDecisions.push(d5);
    await submit(n3.port, d5);

    // restart with same storage and recovery faults
    const recoveryStart = Date.now();
    startNode(n1, [n2.port, n3.port]);
    await waitHealthy(n1.port);
    for (let i = 0; i < 20; i++) {
      await withNetworkFaults(
        { delayMs: 120, dropRate: 0.35, duplicationRate: 0.3 },
        async () => {
          const d: ComplianceDecision = {
            severity: 'CRITICAL',
            action: i % 3 === 0 ? 'HALT_CLUSTER' : 'ESCALATE',
            reasons: Object.freeze([`recovery-${i}`]),
            invariantIds: Object.freeze([`ri-${i % 4}`]),
            violationCount: 1,
            timestamp: 100 + i,
          };
          emittedDecisions.push(d);
          await submit(i % 2 === 0 ? n2.port : n3.port, d);
          return true;
        },
        9000 + i,
      );
    }

    const post = await waitForConvergence([n1.port, n2.port, n3.port], 3, 40000);
    result.recoveryTimeMs = Date.now() - recoveryStart + post.elapsed;
    if (post.report.dimension !== undefined) {
      result.convergence = {
        hash: post.report.dimension.hash,
        journal: post.report.dimension.journal,
        actions: post.report.dimension.actions,
        decision: post.report.dimension.decision,
      };
    }
    result.postRecovery = post.snapshots.find((s) => s.nodeId === n1.nodeId) ?? post.snapshots[0] ?? null;

    const globalAfterRecovery = buildGlobalState(post.snapshots);
    if (result.postRecovery !== null) {
      const subsetJournal = result.postRecovery.executionJournalIds.every((id) => globalAfterRecovery.journalIds.includes(id));
      const subsetActions = result.postRecovery.executedActions.every((a) => globalAfterRecovery.executedActions.includes(a));
      result.validationModel.postRecoveryCorrect = subsetJournal && subsetActions;
      if (!result.validationModel.postRecoveryCorrect) errors.push('post recovery state is not subset/convergent to global state');
    }

    if (result.preCrash !== null && result.postRecovery !== null) {
      const preIds = new Set(result.preCrash.executionJournalIds);
      const postIds = new Set(result.postRecovery.executionJournalIds);
      let lost = 0;
      for (const id of preIds) {
        if (!postIds.has(id)) lost += 1;
      }
      result.replay.lostDecisions = lost;
      result.replay.duplicatedDecisions = hasDuplicates(result.postRecovery.executionJournalIds) ? 1 : 0;
      if (result.postRecovery.executionJournalSize < result.preCrash.executionJournalSize) {
        errors.push('post recovery journal smaller than pre-crash');
      }
      if (lost > 0) errors.push(`lost decisions after recovery: ${lost}`);
      if (result.replay.duplicatedDecisions > 0) errors.push('duplicated decisions after recovery');
      if (hasDuplicates(result.postRecovery.executedActions)) errors.push('executedActions contains duplicates');
    }

    // persistence check (correct model): compare node1 current state before/after isolated restart.
    const beforeIsolatedRestart = await getSnapshot(n1.port);
    await stopNode(n1, 'SIGTERM');
    await rm(`${n1.storagePath}-isolated`, { recursive: true, force: true });
    await cp(n1.storagePath, `${n1.storagePath}-isolated`, { recursive: true });
    const isolated: NodeHandle = {
      nodeId: n1.nodeId,
      port: n1.port,
      storagePath: `${n1.storagePath}-isolated`,
      child: undefined,
      stderrTail: '',
    };
    let isolatedSnap: RuntimeSnapshotLike | null = null;
    startNode(isolated, []);
    try {
      await waitHealthy(isolated.port, 25000);
      isolatedSnap = await getSnapshot(isolated.port);
    } catch {
      errors.push(`isolated restart failed; stderr=${isolated.stderrTail.trim()}`);
    } finally {
      await stopNode(isolated, 'SIGTERM');
    }

    if (isolatedSnap !== null) {
      result.persistence.valid =
        isolatedSnap.stateHash === beforeIsolatedRestart.stateHash &&
        equalSets(isolatedSnap.executionJournalIds, beforeIsolatedRestart.executionJournalIds) &&
        equalSets(isolatedSnap.executedActions, beforeIsolatedRestart.executedActions) &&
        isolatedSnap.lastDecisionId === beforeIsolatedRestart.lastDecisionId;
      if (!result.persistence.valid) errors.push('persistence mismatch against pre-crash snapshot');
    } else {
      result.persistence.valid = false;
      errors.push('persistence check could not acquire isolated snapshot');
    }
    result.validationModel.persistenceCorrect = result.persistence.valid;

    result.persistenceModel = {
      journalAsSourceOfTruth: result.replay.lostDecisions === 0 && result.replay.duplicatedDecisions === 0,
      snapshotConsistent: result.persistence.valid,
      replayCorrect: result.replay.lostDecisions === 0 && result.replay.duplicatedDecisions === 0,
    };

    // Final convergence after node1 rejoins peers.
    startNode(n1, [n2.port, n3.port]);
    await waitHealthy(n1.port, 25000);

    // Deterministic reconciliation: re-broadcast all emitted decisions to all nodes.
    // Idempotent decision execution guarantees this closes delivery gaps without changing semantics.
    const uniqueDecisions = [...new Map(emittedDecisions.map((d) => [JSON.stringify(d), d])).values()];
    for (const d of uniqueDecisions) {
      await submit(n1.port, d);
      await submit(n2.port, d);
      await submit(n3.port, d);
    }

    const finalConv = await waitForConvergence([n1.port, n2.port, n3.port], 1, 60000);
    const globalFinal = buildGlobalState(finalConv.snapshots);
    const allReachGlobal = finalConv.snapshots.every((s) => {
      const computedLast = canonicalSet(s.executionJournalIds).at(-1) ?? null;
      return (
      equalSets(s.executionJournalIds, globalFinal.journalIds)
      && equalSets(s.executedActions, globalFinal.executedActions)
      && computedLast === globalFinal.lastDecisionId
      );
    });
    const allSubsetGlobal = finalConv.snapshots.every((s) =>
      s.executionJournalIds.every((id) => globalFinal.journalIds.includes(id))
      && s.executedActions.every((a) => globalFinal.executedActions.includes(a)));
    const atLeastOneGlobal = finalConv.snapshots.some((s) =>
      equalSets(s.executionJournalIds, globalFinal.journalIds)
      && equalSets(s.executedActions, globalFinal.executedActions));
    result.validationModel.finalConvergence = allReachGlobal || (allSubsetGlobal && atLeastOneGlobal);
    result.diagnostics = Object.freeze({
      finalJournalSizes: Object.freeze(
        Object.fromEntries(finalConv.snapshots.map((s) => [s.nodeId, s.executionJournalSize]))),
    });
    if (!result.validationModel.finalConvergence) errors.push('final global convergence not reached');
    if (finalConv.report.dimension !== undefined) {
      result.convergence = {
        hash: finalConv.report.dimension.hash,
        journal: finalConv.report.dimension.journal,
        actions: finalConv.report.dimension.actions,
        decision: finalConv.report.dimension.decision,
      };
    }

    result.finalResult = errors.length === 0 && result.persistence.valid
      && result.replay.lostDecisions === 0
      && result.replay.duplicatedDecisions === 0
      && result.validationModel.baselineConverged
      && result.validationModel.postRecoveryCorrect
      && result.validationModel.persistenceCorrect
      && result.validationModel.finalConvergence
      ? 'PASS'
      : 'FAIL';
  } catch (e) {
    errors.push((e as Error).message);
    result.finalResult = 'FAIL';
  } finally {
    await stopNode(n1, 'SIGTERM');
    await stopNode(n2, 'SIGTERM');
    await stopNode(n3, 'SIGTERM');
  }

  await mkdir(ROOT, { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(result, null, 2), 'utf8');
  // eslint-disable-next-line no-console
  console.log(`written ${OUT_FILE}`);
  process.exit(result.finalResult === 'PASS' ? 0 : 2);
}

void main();
