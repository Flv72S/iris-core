/**
 * S-2 Refinement — Chaos validation. Hard/soft invariant classification; exit 1 if hard > 0.
 */

import { createSimulationConfig } from '../simulation/engine/SimulationConfig.js';
import { GlobalSimulationEngine } from '../simulation/engine/GlobalSimulationEngine.js';
import { createChaosConfig } from './engine/ChaosConfig.js';
import { ChaosEngine } from './engine/ChaosEngine.js';
import { buildEnterpriseStressTopology, buildEnterpriseStressChaos, scheduleEnterpriseTraffic } from './scenarios/EnterpriseStressScenario.js';

const SEED = 's2-chaos-demo-seed';

function runChaosValidation(): { hash: string; hardViolations: number; softEvents: number } {
  const simConfig = createSimulationConfig({
    numberOfClusters: 10,
    nodesPerCluster: 50,
    baseLatency: 1,
    latencyJitter: 0,
    maxTicks: 2000n,
    deterministicSeed: SEED,
  });
  const engine = new GlobalSimulationEngine(simConfig);
  engine.initialize(SEED);
  buildEnterpriseStressTopology(engine);
  scheduleEnterpriseTraffic(engine, 2000);
  const chaosConfig = createChaosConfig({ attackSeed: SEED, invariantStrictMode: true });
  const chaosEngine = new ChaosEngine(engine, chaosConfig);
  chaosEngine.initialize(SEED);
  buildEnterpriseStressChaos(chaosEngine);
  chaosEngine.run();
  const hash = chaosEngine.getCombinedHash();
  const hardViolations = chaosEngine.hardViolationCount;
  const softEvents = chaosEngine.softEventCount;
  engine.shutdown();
  return { hash, hardViolations, softEvents };
}

function main(): void {
  const r1 = runChaosValidation();
  const r2 = runChaosValidation();
  const identical = r1.hash === r2.hash;
  const noHardViolations = r1.hardViolations === 0 && r2.hardViolations === 0;
  const ok = identical && noHardViolations;
  if (typeof process !== 'undefined' && process.stdout) {
    process.stdout.write('---------------------------------------\n');
    process.stdout.write('S-2 CHAOS VALIDATION RESULTS\n');
    process.stdout.write('---------------------------------------\n');
    process.stdout.write('Run 1 hash: ' + r1.hash + '\n');
    process.stdout.write('Run 2 hash: ' + r2.hash + '\n');
    process.stdout.write('Identical: ' + identical + '\n');
    process.stdout.write('Hard violations: ' + r1.hardViolations + ' (run1), ' + r2.hardViolations + ' (run2)\n');
    process.stdout.write('Soft events: ' + r1.softEvents + ' (run1), ' + r2.softEvents + ' (run2)\n');
    process.stdout.write('---------------------------------------\n');
    process.exit(ok ? 0 : 1);
  }
}

main();

export { ChaosEngine, ChaosEngineError } from './engine/ChaosEngine.js';
export { createChaosConfig, type ChaosConfig } from './engine/ChaosConfig.js';
export type { ChaosLayerSnapshot, ScheduledAttack, AttackKind } from './engine/ChaosTypes.js';
export { ChaosScenarioBuilder } from './scenarios/ChaosScenarioBuilder.js';
export { InvariantMonitor, InvariantViolation } from './monitoring/InvariantMonitor.js';
export type { InvariantMonitorSerialized } from './monitoring/InvariantMonitor.js';
export { HardInvariantType, SoftInvariantType } from './monitoring/InvariantTypes.js';
export { SystemMetricsCollector } from './monitoring/SystemMetricsCollector.js';
export { createChaosReport } from './monitoring/ChaosReport.js';
