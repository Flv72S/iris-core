import { runStressTest } from './stress_runner.js';

export type BenchmarkResult = {
  throughput: number;
  avgLatencyMs: number;
  maxLatencyMs: number;
  runs: number;
};

export async function runObservabilityBenchmark(): Promise<BenchmarkResult> {
  const configs = [
    { messages: 1000, concurrency: 10, mode: 'burst' as const },
    { messages: 5000, concurrency: 25, mode: 'sustained' as const },
  ];
  const latencies: number[] = [];
  let totalThroughput = 0;
  for (const c of configs) {
    const r = await runStressTest(c);
    totalThroughput += r.messagesPerSecond;
    latencies.push(r.durationMs / Math.max(1, r.messages));
  }
  return {
    throughput: totalThroughput / configs.length,
    avgLatencyMs: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    maxLatencyMs: Math.max(...latencies),
    runs: configs.length,
  };
}

