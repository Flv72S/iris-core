import { buildSendDecisionCommand } from '../src/runtime/ops/cli/cli_commands';
import { parseArgs } from '../src/runtime/ops/cli/cli_parser';

const args = parseArgs(process.argv.slice(2));
const base = await buildSendDecisionCommand(process.argv.slice(2));
const count = Number(args.count ?? '100');
const ports = (args.ports ?? String(base.port))
  .split(',')
  .map((x) => Number(x.trim()))
  .filter((n) => Number.isFinite(n));

for (let i = 0; i < count; i++) {
  for (const port of ports) {
    await fetch(`http://127.0.0.1:${port}/decision`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(base.decision),
    });
  }
}
// eslint-disable-next-line no-console
console.log(`storm sent: count=${count}, ports=${ports.join(',')}`);
