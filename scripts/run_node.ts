import { IRISNodeRuntime } from '../src/runtime/node_runtime';
import { parseNodeConfigFromArgv } from '../src/runtime/node_config';

const runtime = new IRISNodeRuntime(parseNodeConfigFromArgv(process.argv.slice(2)));
void runtime.start();

async function shutdown(): Promise<void> {
  await runtime.stop();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
