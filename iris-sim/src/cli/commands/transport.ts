import { getSecureTransportMetricsSnapshot, getTransportSessionDebug } from '../../network/secure_transport/transport_metrics.js';
import type { CliCommandResult } from '../cli_types.js';

/**
 * `iris transport debug` — in-process secure transport metrics + last session introspection (16F.X5.X6).
 */
export async function runTransport(_cwd: string, argv: string[]): Promise<CliCommandResult> {
  const sub = argv[3];
  const wantJson = argv.includes('--json');

  if (sub !== 'debug') {
    console.error('Usage: iris transport debug [--json]');
    return { exitCode: 1 };
  }

  const metrics = getSecureTransportMetricsSnapshot();
  const lastSession = getTransportSessionDebug();

  if (wantJson) {
    console.log(
      JSON.stringify({
        metrics,
        sessionId: lastSession?.sessionId ?? null,
        pfsEnabled: lastSession?.pfsEnabled ?? null,
        rekeyMode: lastSession?.rekeyMode ?? null,
        pfsMode: lastSession?.pfsMode ?? null,
      }),
    );
  } else {
    console.log('IRIS secure transport (debug)\n');
    console.log('lastSession:');
    if (lastSession) {
      console.log(`  sessionId:   ${lastSession.sessionId}`);
      console.log(`  pfsEnabled:  ${lastSession.pfsEnabled}`);
      console.log(`  rekeyMode:   ${lastSession.rekeyMode}`);
      if (lastSession.pfsMode !== undefined) {
        console.log(`  pfsMode:     ${lastSession.pfsMode}`);
      }
    } else {
      console.log('  (no handshake in this process yet)');
    }
    console.log('\ntransport metrics:');
    for (const [k, v] of Object.entries(metrics)) {
      console.log(`  ${k.padEnd(24)} ${v}`);
    }
  }

  return { exitCode: 0 };
}
