import { buildSendDecisionCommand } from '../src/runtime/ops/cli/cli_commands';
import { parseArgs } from '../src/runtime/ops/cli/cli_parser';
import { withNetworkFaults } from '../src/runtime/ops/network_tools';

const args = parseArgs(process.argv.slice(2));
const cmd = await buildSendDecisionCommand(process.argv.slice(2));
const ports = (args.ports ?? String(cmd.port))
  .split(',')
  .map((x) => Number(x.trim()))
  .filter((n) => Number.isFinite(n));
const dropRate = Number(args.dropRate ?? '0.5');
const duplicationRate = Number(args.duplicationRate ?? '0.2');
const delayMs = Number(args.delayMs ?? '200');

let seed = Number(args.seed ?? '1337');
for (const port of ports) {
  const decision = cmd.decision;
  await withNetworkFaults(
    { dropRate, duplicationRate, delayMs },
    async () => {
      const res = await fetch(`http://127.0.0.1:${port}/decision`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(decision),
      });
      return res.ok;
    },
    seed++,
  );
}
// eslint-disable-next-line no-console
console.log(`partition simulator sent on ports=${ports.join(',')}`);
