import { checkConvergenceByHash } from '../src/runtime/ops/convergence_checker';
import { parseArgs } from '../src/runtime/ops/cli/cli_parser';

const args = parseArgs(process.argv.slice(2));
const ports = (args.ports ?? '3001,3002,3003')
  .split(',')
  .map((x) => Number(x.trim()))
  .filter((n) => Number.isFinite(n));

const hashes: Record<string, string> = {};
for (const port of ports) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    if (!res.ok) {
      hashes[`node-${port}`] = `unreachable:${res.status}`;
      continue;
    }
    const body = (await res.json()) as { stateHash?: string };
    hashes[`node-${port}`] = body.stateHash ?? 'missing';
  } catch {
    hashes[`node-${port}`] = 'unreachable:fetch_error';
  }
}

const report = checkConvergenceByHash(hashes);
// eslint-disable-next-line no-console
console.log(JSON.stringify(report, null, 2));
process.exit(report.converged ? 0 : 2);
