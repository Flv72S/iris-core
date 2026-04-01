/**
 * S-3 Robustness Validation — Entry point. Safety & liveness under soft event growth.
 */

import { getAllS3StressConfigs } from './S3StressConfig.js';
import { runAllS3StressTests } from './S3StressRunner.js';
import { analyzeAllS3StressResults, getS3StressOverallPass } from './S3StressAnalyzer.js';

function main(): number {
  const configs = getAllS3StressConfigs();
  const results = runAllS3StressTests(configs);
  const analysis = analyzeAllS3StressResults(results);
  const overallPass = getS3StressOverallPass(analysis);

  const out = typeof process !== 'undefined' ? process.stdout : null;
  function write(s: string): void {
    if (out) out.write(s);
  }

  write('=====================================================\n');
  write('S-3 FORMAL ROBUSTNESS VALIDATION\n');
  write('Safety & Liveness Under Soft Growth\n');
  write('=====================================================\n\n');

  for (let i = 0; i < analysis.length; i++) {
    const a = analysis[i];
    const result = results[i];
    write(a.testName + '\n');
    write('Soft events: ' + String(a.softEventCount) + '\n');
    write('Simulation Hash Identical: ' + String(a.simulationHashIdentical) + '\n');
    write('Verification Hash Identical: ' + String(a.verificationHashIdentical) + '\n');
    write('Safety: ' + (a.safetyPass ? 'PASS' : 'FAIL') + '\n');
    if (!a.safetyPass && result) {
      const violated = result.propertyResultsRun1.safetyResults.filter((r) => r.status === 'VIOLATED');
      for (const r of violated) write('  VIOLATED: ' + r.id + '\n');
    }
    write('Liveness: ' + (a.livenessPass ? 'PASS' : 'FAIL') + '\n');
    if (!a.livenessPass && result) {
      const violated = result.propertyResultsRun1.livenessResults.filter((r) => r.status === 'VIOLATED');
      for (const r of violated) write('  VIOLATED: ' + r.id + '\n');
    }
    write('Result: ' + a.verdict + '\n\n');
  }

  write('=====================================================\n');
  write('FINAL RESULT: ' + (overallPass ? 'PASS' : 'FAIL') + '\n');
  write('=====================================================\n');

  return overallPass ? 0 : 1;
}

const exitCode = main();
process.exit(exitCode);

export { getAllS3StressConfigs, getS3BaselineConfig, getS3NodeScalingConfig, getS3IntensityScalingConfig, getS3DurationScalingConfig } from './S3StressConfig.js';
export { runS3StressTest, runAllS3StressTests } from './S3StressRunner.js';
export type { S3StressTestResult } from './S3StressRunner.js';
export { analyzeS3StressResult, analyzeAllS3StressResults, getS3StressOverallPass } from './S3StressAnalyzer.js';
export type { S3StressAnalysisResult, S3StressVerdict } from './S3StressAnalyzer.js';
