import type { CliCommandResult } from '../cli_types.js';
import { runObservabilityBenchmark } from '../../observability/index.js';

export async function runBenchmark(_cwd: string, argv: string[]): Promise<CliCommandResult> {
  const jsonMode = argv.includes('--json');
  const result = await runObservabilityBenchmark();
  if (jsonMode) {
    console.log(JSON.stringify(result));
    return { exitCode: 0 };
  }
  console.log('⚙️ IRIS Benchmark\n');
  console.log(`throughput: ${result.throughput.toFixed(2)} msg/s`);
  console.log(`avg latency: ${result.avgLatencyMs.toFixed(3)} ms`);
  console.log(`max latency: ${result.maxLatencyMs.toFixed(3)} ms`);
  console.log(`runs: ${result.runs}`);
  return { exitCode: 0 };
}

