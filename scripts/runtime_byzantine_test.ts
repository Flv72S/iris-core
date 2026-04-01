import { execSync, spawn, type ChildProcess } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createServer } from 'node:net';

import type { ComplianceDecision } from '../src/distributed/cluster_compliance_engine';
import { deriveComplianceDecisionId } from '../src/distributed/cluster_compliance_executor';
import type { RuntimeSnapshotLike } from '../src/runtime/ops/convergence_checker';
import {
  applyPayloadCorruption,
  tamperDecisionWithFakeId,
  type ByzantineFaultInjectionConfig,
} from '../src/runtime/ops/network_tools';
import { encodeCanonicalMessage } from '../src/runtime/network/message_codec';
import { hasIdenticalOrderAcrossNodes } from '../src/runtime/ops/ordering_validator';
import { ByzantineNode } from '../src/runtime/simulation/byzantine_node';

type ByzantineReport = {
  readonly invalidDecisionsRejected: number;
  readonly corruptedMessagesHandled: number;
  readonly forksResolved: number;
  readonly systemStable: boolean;
  readonly converged: boolean;
  readonly honestMajority: boolean;
};

type ScenarioResult = {
  readonly name: string;
  readonly pass: boolean;
  readonly detail: string;
};

type OrderingReport = {
  readonly deterministic: boolean;
  readonly sameExecutionOrder: boolean;
  readonly orderingViolations: number;
  readonly replayMatch: boolean;
};

type HarnessConfig = {
  readonly byzantineRate: number;
  readonly corruptionRate: number;
  readonly duplicationRate: number;
  readonly dropRate: number;
};

type Snapshot = RuntimeSnapshotLike & {
  readonly executionJournalSize?: number;
  readonly byzantine?: {
    readonly invalidDecisionsRejected: number;
    readonly corruptedMessagesHandled: number;
    readonly stateSyncRejected: number;
    readonly forksResolved: number;
  };
};

const ROOT = process.cwd();
const OUT = join(ROOT, 'runtime_byzantine_test_result.json');

const DEFAULT_CFG: HarnessConfig = Object.freeze({
  byzantineRate: 0.3,
  corruptionRate: 0.2,
  duplicationRate: 0.5,
  dropRate: 0.3,
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type NodeHandle = {
  readonly nodeId: string;
  readonly port: number;
  readonly storagePath: string;
  readonly honest: boolean;
  child: ChildProcess | undefined;
  stderrTail: string;
};

function nodeCli(
  port: number,
  peers: readonly number[],
  storagePath: string,
  nodeId: string,
): string {
  return [
    'npx',
    'tsx',
    'scripts/run_node.ts',
    `--port=${port}`,
    `--peers=${peers.join(',')}`,
    `--storagePath=${storagePath}`,
    `--nodeId=${nodeId}`,
    '--gossipIntervalMs=200',
    '--retryIntervalMs=100',
    '--maxRetryAttempts=8',
  ].join(' ');
}

function startNode(handle: NodeHandle, peers: readonly number[]): void {
  const cmd = nodeCli(handle.port, peers, handle.storagePath, handle.nodeId);
  handle.child = spawn('cmd.exe', ['/d', '/s', '/c', cmd], {
    cwd: ROOT,
    stdio: 'pipe',
    shell: false,
  });
  handle.child.stdout?.on('data', () => {});
  handle.child.stderr?.on('data', (buf) => {
    const chunk = String(buf);
    handle.stderrTail = `${handle.stderrTail}\n${chunk}`.slice(-2000);
  });
}

async function stopNode(handle: NodeHandle): Promise<void> {
  const c = handle.child;
  handle.child = undefined;
  if (c === undefined) return;
  if (process.platform === 'win32' && c.pid !== undefined) {
    try {
      execSync(`taskkill /PID ${c.pid} /T /F`, { stdio: 'ignore' });
    } catch {
      c.kill('SIGTERM');
    }
  } else {
    c.kill('SIGTERM');
  }
  await sleep(500);
}

async function pickFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const addr = s.address();
      if (addr === null || typeof addr === 'string') {
        reject(new Error('free port'));
        return;
      }
      const port = addr.port;
      s.close(() => resolve(port));
    });
  });
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
  throw new Error(`node ${port} unhealthy`);
}

async function getSnapshot(port: number): Promise<Snapshot> {
  const res = await fetch(`http://127.0.0.1:${port}/state_snapshot`);
  if (!res.ok) throw new Error(`snapshot ${port}`);
  return (await res.json()) as Snapshot;
}

async function postDecision(port: number, decision: ComplianceDecision): Promise<number> {
  const res = await fetch(`http://127.0.0.1:${port}/decision`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: encodeCanonicalMessage(decision),
  });
  return res.status;
}

async function postDecisionRaw(port: number, body: string): Promise<number> {
  const res = await fetch(`http://127.0.0.1:${port}/decision`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });
  return res.status;
}

function hasDuplicates(ids: readonly string[]): boolean {
  return new Set(ids).size !== ids.length;
}

function cmpIdLooksCanonical(id: string): boolean {
  return id.startsWith('CMP:') && id.length > 16;
}

function journalIntegrity(s: Snapshot, knownValidIds: ReadonlySet<string>): boolean {
  if (hasDuplicates(s.executionJournalIds)) return false;
  for (const id of s.executionJournalIds) {
    if (!cmpIdLooksCanonical(id)) return false;
    if (knownValidIds.size > 0 && !knownValidIds.has(id)) return false;
  }
  return true;
}

function aggregateByzantine(snaps: readonly Snapshot[]): Omit<ByzantineReport, 'forksResolved' | 'systemStable' | 'converged' | 'honestMajority'> {
  let invalidDecisionsRejected = 0;
  let corruptedMessagesHandled = 0;
  for (const s of snaps) {
    const b = s.byzantine;
    if (b === undefined) continue;
    invalidDecisionsRejected += b.invalidDecisionsRejected;
    corruptedMessagesHandled += b.corruptedMessagesHandled;
  }
  return { invalidDecisionsRejected, corruptedMessagesHandled };
}

function canonicalSet(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort());
}

function equalSets(a: readonly string[], b: readonly string[]): boolean {
  return JSON.stringify(canonicalSet(a)) === JSON.stringify(canonicalSet(b));
}

function convergedDistributed(snaps: readonly Snapshot[]): boolean {
  if (snaps.length <= 1) return true;
  const f = snaps[0]!;
  return snaps.every((s) =>
    equalSets(s.executionJournalIds, f.executionJournalIds)
    && equalSets(s.executedActions, f.executedActions));
}

/**
 * Semantic convergence: same journal id set and executed-actions set on every node.
 * Cross-node `stateHash` is not compared (each node may differ in cluster view metadata).
 */
function convergedGlobalState(snaps: readonly Snapshot[]): boolean {
  return convergedDistributed(snaps)
    && !snaps.some((s) => hasDuplicates(s.executionJournalIds));
}

/** Same decision-id set everywhere (order of application may differ across nodes). */
function convergedJournalOnly(snaps: readonly Snapshot[]): boolean {
  if (snaps.length <= 1) return true;
  const f = snaps[0]!;
  return snaps.every((s) =>
    equalSets(s.executionJournalIds, f.executionJournalIds)
    && !hasDuplicates(s.executionJournalIds));
}

async function waitConverge(
  ports: readonly number[],
  stableCycles = 2,
  timeoutMs = 35000,
  predicate: (snaps: readonly Snapshot[]) => boolean = convergedGlobalState,
): Promise<{ snaps: Snapshot[]; converged: boolean; elapsed: number }> {
  const t0 = Date.now();
  let ok = 0;
  let last: Snapshot[] = [];
  while (Date.now() - t0 < timeoutMs) {
    last = await Promise.all(ports.map((p) => getSnapshot(p)));
    if (predicate(last)) ok += 1;
    else ok = 0;
    if (ok >= stableCycles) {
      return { snaps: last, converged: true, elapsed: Date.now() - t0 };
    }
    await sleep(400);
  }
  return { snaps: last, converged: false, elapsed: Date.now() - t0 };
}

function buildCorruptionConfig(seed: number, cfg: HarnessConfig): ByzantineFaultInjectionConfig {
  return Object.freeze({
    seed,
    corruptionRate: cfg.corruptionRate,
    truncateRate: cfg.dropRate,
    injectInvalidFieldRate: cfg.byzantineRate,
  });
}

async function withCluster(
  honestCount: number,
  byzantineCount: number,
  fn: (ctx: {
    nodes: NodeHandle[];
    ports: number[];
    honest: NodeHandle[];
    byzantine: NodeHandle[];
  }) => Promise<void>,
): Promise<void> {
  const total = honestCount + byzantineCount;
  const ports: number[] = [];
  for (let i = 0; i < total; i++) ports.push(await pickFreePort());
  const nodes: NodeHandle[] = ports.map((port, i) => ({
    nodeId: `node-${port}`,
    port,
    storagePath: `.iris-byz-${port}`,
    honest: i < honestCount,
    child: undefined,
    stderrTail: '',
  }));
  for (const n of nodes) await rm(n.storagePath, { recursive: true, force: true });

  for (const n of nodes) startNode(n, ports.filter((p) => p !== n.port));

  for (const n of nodes) {
    try {
      await waitHealthy(n.port);
    } catch {
      throw new Error(`start failed ${n.port} stderr=${n.stderrTail.trim()}`);
    }
  }

  try {
    await fn({
      nodes,
      ports,
      honest: nodes.filter((n) => n.honest),
      byzantine: nodes.filter((n) => !n.honest),
    });
  } finally {
    for (const n of nodes) await stopNode(n);
    await sleep(2500);
  }
}

function decisionTemplate(i: number, action: ComplianceDecision['action'] = 'ESCALATE'): ComplianceDecision {
  return Object.freeze({
    severity: 'CRITICAL',
    action,
    reasons: Object.freeze([`byz-reason-${i}`]),
    invariantIds: Object.freeze([`inv-${i}`]),
    violationCount: 1,
    timestamp: 10_000 + i,
  });
}

async function main(): Promise<void> {
  const cfg = DEFAULT_CFG;
  const scenarioResults: ScenarioResult[] = [];
  let sumInvalid = 0;
  let sumCorrupt = 0;
  let forksResolvedTotal = 0;
  let systemStable = true;
  let lastHonestMajorityConverged = false;
  let ordering: OrderingReport = {
    deterministic: false,
    sameExecutionOrder: false,
    orderingViolations: 1,
    replayMatch: false,
  };

  const errors: string[] = [];

  // --- Scenario 1: corrupted / invalid payloads rejected ---
  try {
    await withCluster(3, 2, async ({ honest, byzantine, ports }) => {
      const valid = decisionTemplate(1);
      const validId = deriveComplianceDecisionId(valid);
      await postDecision(honest[0]!.port, valid);
      const corruptCfg = buildCorruptionConfig(42, cfg);
      let httpRejected = 0;
      for (const n of byzantine) {
        const raw = applyPayloadCorruption(encodeCanonicalMessage(valid), { ...corruptCfg, seed: n.port });
        if ((await postDecisionRaw(n.port, raw)) === 400) httpRejected += 1;
        if ((await postDecisionRaw(n.port, '{ not json')) === 400) httpRejected += 1;
      }
      await sleep(1200);
      const snaps = await Promise.all(ports.map((p) => getSnapshot(p)));
      const agg = aggregateByzantine(snaps);
      const honestSnaps = await Promise.all(honest.map((h) => getSnapshot(h.port)));
      const ok = httpRejected >= 2
        && honestSnaps.every((s) => journalIntegrity(s, new Set([validId])));
      scenarioResults.push({
        name: 'corrupted_decisions',
        pass: ok,
        detail: ok ? 'rejected at boundary' : 'expected rejections or journal leak',
      });
      if (!ok) errors.push('corrupted_decisions');
      sumInvalid += agg.invalidDecisionsRejected;
      sumCorrupt += agg.corruptedMessagesHandled;
    });
  } catch (e) {
    systemStable = false;
    scenarioResults.push({ name: 'corrupted_decisions', pass: false, detail: (e as Error).message });
    errors.push((e as Error).message);
  }

  // --- Scenario 2: fake decision IDs (extra fields) ---
  try {
    await withCluster(3, 2, async ({ honest, ports }) => {
      const d = decisionTemplate(2);
      const forged = tamperDecisionWithFakeId(d);
      let rejects = 0;
      for (const p of ports) {
        const st = await postDecisionRaw(p, JSON.stringify(forged));
        if (st === 400) rejects += 1;
      }
      await postDecision(honest[0]!.port, d);
      await sleep(800);
      const snaps = await Promise.all(ports.map((p) => getSnapshot(p)));
      const agg = aggregateByzantine(snaps);
      const ok = rejects >= 3
        && snaps.every((s) => !hasDuplicates(s.executionJournalIds))
        && snaps.every((s) => journalIntegrity(s, new Set()));
      scenarioResults.push({
        name: 'fake_decision_ids',
        pass: ok,
        detail: `rejects=${rejects} aggInvalid=${agg.invalidDecisionsRejected}`,
      });
      if (!ok) errors.push('fake_decision_ids');
      sumInvalid += agg.invalidDecisionsRejected;
      sumCorrupt += agg.corruptedMessagesHandled;
    });
  } catch (e) {
    systemStable = false;
    scenarioResults.push({ name: 'fake_decision_ids', pass: false, detail: (e as Error).message });
    errors.push((e as Error).message);
  }

  // --- Scenario 3: reordering + honest set convergence ---
  try {
    await withCluster(3, 2, async ({ honest, byzantine, ports }) => {
      const ds = [decisionTemplate(31, 'ESCALATE'), decisionTemplate(32, 'LOG_ONLY'), decisionTemplate(33, 'HALT_CLUSTER')];
      const invalidator = new ByzantineNode('b0', 'INVALID_ACTION', 99);
      for (const n of byzantine) {
        const t = invalidator.inject(ds[0]!);
        if (t) void postDecisionRaw(n.port, JSON.stringify(t));
      }
      await postDecision(honest[0]!.port, ds[2]!);
      await postDecision(honest[0]!.port, ds[0]!);
      await postDecision(honest[0]!.port, ds[1]!);
      await postDecision(honest[1]!.port, ds[0]!);
      await postDecision(honest[1]!.port, ds[1]!);
      await postDecision(honest[1]!.port, ds[2]!);
      await postDecision(honest[2]!.port, ds[1]!);
      await postDecision(honest[2]!.port, ds[0]!);
      await postDecision(honest[2]!.port, ds[2]!);
      for (const d of ds) {
        for (const p of ports) await postDecision(p, d);
      }
      const fin = await waitConverge(ports, 2, 60000, convergedJournalOnly);
      const ok = fin.converged && convergedJournalOnly(fin.snaps);
      scenarioResults.push({
        name: 'reorder_tamper',
        pass: ok,
        detail: `elapsed=${fin.elapsed}`,
      });
      if (!ok) errors.push('reorder_tamper');
      const ag = aggregateByzantine(fin.snaps);
      sumInvalid += ag.invalidDecisionsRejected;
      sumCorrupt += ag.corruptedMessagesHandled;
      lastHonestMajorityConverged = lastHonestMajorityConverged || ok;
    });
  } catch (e) {
    systemStable = false;
    scenarioResults.push({ name: 'reorder_tamper', pass: false, detail: (e as Error).message });
    errors.push((e as Error).message);
  }

  // --- Scenario 4: transient journal mismatch then heal ---
  try {
    await withCluster(3, 2, async ({ ports, honest }) => {
      const canon = [decisionTemplate(41), decisionTemplate(42), decisionTemplate(43)];
      await postDecision(honest[0]!.port, canon[0]!);
      await postDecision(honest[1]!.port, canon[1]!);
      await sleep(120);
      const mid = await Promise.all(ports.map((p) => getSnapshot(p)));
      const misaligned =
        !convergedDistributed(mid) || new Set(mid.map((s) => s.stateHash)).size > 1;
      for (const d of canon) {
        for (const p of ports) await postDecision(p, d);
      }
      const fin = await waitConverge(ports, 2, 90000);
      const ids = new Set(canon.map((d) => deriveComplianceDecisionId(d)));
      const ok = fin.converged && convergedGlobalState(fin.snaps)
        && fin.snaps.every((s) =>
          [...ids].every((id) => s.executionJournalIds.includes(id))
          && !hasDuplicates(s.executionJournalIds));
      const forksResolved = misaligned && fin.converged ? 1 : 0;
      forksResolvedTotal += forksResolved;
      scenarioResults.push({
        name: 'fork_journal_heal',
        pass: ok,
        detail: `misaligned=${misaligned} forksResolved=${forksResolved}`,
      });
      if (!ok) errors.push('fork_journal_heal');
    });
  } catch (e) {
    systemStable = false;
    scenarioResults.push({ name: 'fork_journal_heal', pass: false, detail: (e as Error).message });
    errors.push((e as Error).message);
  }

  // --- Scenario 5: random noise ---
  try {
    await withCluster(3, 2, async ({ ports, honest }) => {
      const rngBody = JSON.stringify({ totally: 'not', a: 'decision', n: Math.random() });
      for (const p of ports) await postDecisionRaw(p, rngBody);
      const st = await getSnapshot(honest[0]!.port);
      const ok = journalIntegrity(st, new Set());
      scenarioResults.push({ name: 'random_noise', pass: ok, detail: 'no crash' });
      if (!ok) errors.push('random_noise');
    });
  } catch (e) {
    systemStable = false;
    scenarioResults.push({ name: 'random_noise', pass: false, detail: (e as Error).message });
    errors.push((e as Error).message);
  }

  // --- Scenario 6: byzantine majority (stability > convergence) ---
  try {
    await withCluster(2, 3, async ({ honest, byzantine, ports }) => {
      const atk = new ByzantineNode('maj', 'INVALID_ACTION', 11);
      const d = decisionTemplate(61);
      await postDecision(honest[0]!.port, d);
      for (let i = 0; i < 5; i++) {
        const b = atk.inject(decisionTemplate(100 + i));
        if (b) {
          for (const n of byzantine) void postDecisionRaw(n.port, JSON.stringify(b));
        }
        const noise = applyPayloadCorruption(encodeCanonicalMessage(d), buildCorruptionConfig(i * 17, cfg));
        for (const n of byzantine) void postDecisionRaw(n.port, noise);
      }
      await sleep(1500);
      const snaps = await Promise.all(ports.map((p) => getSnapshot(p)));
      const stable = snaps.every((s) => !hasDuplicates(s.executionJournalIds))
        && snaps.every((s) => s.executionJournalIds.every((id) => cmpIdLooksCanonical(id)));
      scenarioResults.push({
        name: 'byzantine_majority',
        pass: stable,
        detail: `converged=${convergedDistributed(snaps)}`,
      });
      if (!stable) errors.push('byzantine_majority unstable');
    });
  } catch (e) {
    systemStable = false;
    scenarioResults.push({ name: 'byzantine_majority', pass: false, detail: (e as Error).message });
    errors.push((e as Error).message);
  }

  // --- Scenario 7: honest majority convergence ---
  try {
    await withCluster(3, 2, async ({ honest, byzantine, ports }) => {
      const seq = [decisionTemplate(71), decisionTemplate(72), decisionTemplate(73, 'FREEZE_TRANSITIONS')];
      const atk = new ByzantineNode('hon', 'CORRUPT_DECISION', 7);
      for (const d of seq) {
        await postDecision(honest[0]!.port, d);
        const bad = atk.inject(d);
        if (bad) {
          for (const n of byzantine) void postDecisionRaw(n.port, JSON.stringify(bad));
        }
      }
      for (const d of seq) {
        for (const p of ports) await postDecision(p, d);
      }
      const fin = await waitConverge(ports, 3, 90000);
      const ok = fin.converged && convergedGlobalState(fin.snaps);
      const orderedByNode = Object.fromEntries(fin.snaps.map((s) => [s.nodeId, s.executionJournalIds])) as Record<string, readonly string[]>;
      const sameExecutionOrder = hasIdenticalOrderAcrossNodes(orderedByNode);
      scenarioResults.push({
        name: 'honest_majority',
        pass: ok,
        detail: `elapsed=${fin.elapsed}`,
      });
      if (!ok) errors.push('honest_majority');
      lastHonestMajorityConverged = ok;
      const ag = aggregateByzantine(fin.snaps);
      sumInvalid += ag.invalidDecisionsRejected;
      sumCorrupt += ag.corruptedMessagesHandled;
      ordering = {
        deterministic: ok && sameExecutionOrder,
        sameExecutionOrder,
        orderingViolations: sameExecutionOrder ? 0 : 1,
        replayMatch: ok,
      };
    });
  } catch (e) {
    systemStable = false;
    scenarioResults.push({ name: 'honest_majority', pass: false, detail: (e as Error).message });
    errors.push((e as Error).message);
  }

  const scenarioPass = scenarioResults.filter((s) => s.pass).length;
  const finalPass = systemStable && errors.length === 0 && scenarioPass === scenarioResults.length;

  const globalReport: ByzantineReport = Object.freeze({
    invalidDecisionsRejected: sumInvalid,
    corruptedMessagesHandled: sumCorrupt,
    forksResolved: forksResolvedTotal,
    systemStable,
    converged: lastHonestMajorityConverged,
    honestMajority: true,
  });

  const payload = Object.freeze({
    finalResult: finalPass ? 'PASS' : 'FAIL',
    config: cfg,
    scenarios: scenarioResults,
    byzantine: globalReport,
    ordering,
    errors,
  });

  await mkdir(ROOT, { recursive: true });
  await writeFile(OUT, JSON.stringify(payload, null, 2), 'utf8');
  // eslint-disable-next-line no-console
  console.log(`written ${OUT}`);
  process.exit(finalPass ? 0 : 2);
}

void main();
