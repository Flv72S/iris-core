import { buildSendDecisionCommand } from '../src/runtime/ops/cli/cli_commands';

const cmd = await buildSendDecisionCommand(process.argv.slice(2));
const res = await fetch(`http://127.0.0.1:${cmd.port}/decision`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(cmd.decision),
});
if (!res.ok) {
  throw new Error(`send_decision failed (${res.status})`);
}
// eslint-disable-next-line no-console
console.log(`decision sent to ${cmd.port}`);
