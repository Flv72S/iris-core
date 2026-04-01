/**
 * S-3 — Formal verification layer. Enterprise stress integration; double-run hash comparison.
 */

import { GlobalSimulationEngine } from '../simulation/engine/GlobalSimulationEngine.js';
import { createSimulationConfig } from '../simulation/engine/SimulationConfig.js';
import { ChaosEngine } from '../chaos/engine/ChaosEngine.js';
import { createChaosConfig } from '../chaos/engine/ChaosConfig.js';
import { buildEnterpriseStressTopology, scheduleEnterpriseTraffic, buildEnterpriseStressChaos } from '../chaos/scenarios/EnterpriseStressScenario.js';
import { VerificationEngine } from './core/VerificationEngine.js';
import { createVerificationConfig } from './core/VerificationConfig.js';
import { createNoDoubleDeliveryProperty } from './properties/NoDoubleDeliveryProperty.js';
import { createNoDeliveryAcrossPartitionProperty } from './properties/NoDeliveryAcrossPartitionProperty.js';
import { createNoInvalidStateTransitionProperty } from './properties/NoInvalidStateTransitionProperty.js';
import { createNoNegativeTickProperty } from './properties/NoNegativeTickProperty.js';
import { createEventualDeliveryProperty } from './properties/EventualDeliveryProperty.js';
import { createNoDeadlockProperty } from './properties/NoDeadlockProperty.js';
import { createNoStarvationProperty } from './properties/NoStarvationProperty.js';
import { createPartitionHealingProperty } from './properties/PartitionHealingProperty.js';
import { createNoPermanentSplitBrainProperty } from './properties/NoPermanentSplitBrainProperty.js';
import { formatVerificationReport } from './reporting/VerificationReport.js';

const SEED = 's3-formal-verification-seed';
const MAX_TICKS = 1500n;
const MESSAGE_COUNT = 5000;

function runOneSimulation(): { simHash: string; verHash: string; reportOverall: string; report: ReturnType<VerificationEngine['getVerificationReport']> } {
  const simConfig = createSimulationConfig({
    maxTicks: MAX_TICKS,
    deterministicSeed: SEED,
  });
  const engine = new GlobalSimulationEngine(simConfig);
  engine.initialize(SEED);
  buildEnterpriseStressTopology(engine);
  scheduleEnterpriseTraffic(engine, MESSAGE_COUNT);

  const chaosConfig = createChaosConfig({ attackSeed: SEED, invariantStrictMode: true });
  const chaosEngine = new ChaosEngine(engine, chaosConfig);
  chaosEngine.initialize(SEED);
  buildEnterpriseStressChaos(chaosEngine);

  const verConfig = createVerificationConfig({
    maxTraceWindowSize: 15000,
    livenessWindowTicks: 500n,
  });
  const verification = new VerificationEngine(engine, verConfig);
  verification.registerProperty(createNoDoubleDeliveryProperty());
  verification.registerProperty(createNoDeliveryAcrossPartitionProperty());
  verification.registerProperty(createNoInvalidStateTransitionProperty());
  verification.registerProperty(createNoNegativeTickProperty());
  verification.registerProperty(createEventualDeliveryProperty());
  verification.registerProperty(createNoDeadlockProperty(verConfig.livenessWindowTicks));
  verification.registerProperty(createNoStarvationProperty());
  verification.registerProperty(createPartitionHealingProperty());
  verification.registerProperty(createNoPermanentSplitBrainProperty());
  verification.initialize();

  for (let t = 0n; t <= MAX_TICKS; t++) {
    engine.runUntil(t);
    verification.evaluateTick(t);
  }
  verification.finalize();

  const simHash = engine.getExecutionHash();
  const report = verification.getVerificationReport();
  const verHash = verification.getVerificationHash();
  return { simHash, verHash, reportOverall: report.overall, report };
}

function main(): number {
  const run1 = runOneSimulation();
  const run2 = runOneSimulation();

  const simIdentical = run1.simHash === run2.simHash;
  const verIdentical = run1.verHash === run2.verHash;
  const allPass = run1.reportOverall === 'PASS' && run2.reportOverall === 'PASS';
  const overallResult = simIdentical && verIdentical && allPass ? 'PASS' : 'FAIL';

  console.log('');
  console.log('==================================================');
  console.log('S-3 FORMAL VERIFICATION VALIDATION');
  console.log('==================================================');
  console.log('');
  console.log('Simulation Hash Run1: ' + run1.simHash);
  console.log('Simulation Hash Run2: ' + run2.simHash);
  console.log('Identical: ' + String(simIdentical));
  console.log('');
  console.log('Verification Hash Run1: ' + run1.verHash);
  console.log('Verification Hash Run2: ' + run2.verHash);
  console.log('Identical: ' + String(verIdentical));
  console.log('');
  console.log('Overall Result: ' + overallResult);
  if (overallResult === 'FAIL') {
    console.log('');
    console.log('--- Property results (Run1) ---');
    console.log(formatVerificationReport(run1.report));
  }
  console.log('==================================================');
  console.log('');

  return overallResult === 'PASS' ? 0 : 1;
}

const exitCode = main();
process.exit(exitCode);
