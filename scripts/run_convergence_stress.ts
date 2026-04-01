import { performance } from 'node:perf_hooks';

import { evaluateGraphStrict, mergeGraphs, serializeEngineState } from '../src/distributed/state_engine';
import { generateAdversarialGraph } from '../tests/utils/adversarial_graph_generator';

function parseArg(name: string, fallback: number): number {
  const token = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!token) return fallback;
  const value = Number(token.slice(name.length + 3));
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid --${name} value`);
  }
  return Math.floor(value);
}

async function main(): Promise<void> {
  const runs = parseArg('runs', 100);
  const size = parseArg('size', 500);
  const baseSeed = parseArg('seed', 424242);

  const failures: Array<{ run: number; seed: number; message: string }> = [];
  let totalMs = 0;
  for (let run = 0; run < runs; run++) {
    const seed = baseSeed + run * 7919;
    const t0 = performance.now();
    try {
      const a = generateAdversarialGraph({
        seed,
        eventCount: size,
        keySpace: Math.max(4, Math.floor(size / 20)),
        branchingFactor: 4,
        depthSkew: 0.6,
        concurrencyDensity: 0.3,
        conflictDensity: 0.7,
        deleteRatio: 0.35,
      }).graph;
      const b = generateAdversarialGraph({
        seed: seed + 1,
        eventCount: size,
        keySpace: Math.max(4, Math.floor(size / 20)),
        branchingFactor: 4,
        depthSkew: 0.6,
        concurrencyDensity: 0.3,
        conflictDensity: 0.7,
        deleteRatio: 0.35,
      }).graph;
      const ab = mergeGraphs(a, b);
      const ba = mergeGraphs(b, a);
      const sab = serializeEngineState(evaluateGraphStrict(ab));
      const sba = serializeEngineState(evaluateGraphStrict(ba));
      if (sab !== sba) {
        failures.push({ run, seed, message: 'state mismatch between merge orders' });
      }
    } catch (error) {
      failures.push({
        run,
        seed,
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      totalMs += performance.now() - t0;
    }
  }

  const avgMs = totalMs / runs;
  if (failures.length > 0) {
    console.error(JSON.stringify({ pass: false, runs, size, avgMs, failures }, null, 2));
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify({ pass: true, runs, size, avgMs, failureSeeds: [] }, null, 2));
}

void main();
