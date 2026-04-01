import type { LogLevel } from './log_levels';
import type { StructuredLog } from './structured_log';
import { shortStateHash } from './state_inspector';

export class RuntimeLogger {
  constructor(private readonly nodeId: string) {}

  log(
    level: LogLevel,
    event: string,
    state: unknown,
    decisionId?: string,
    details?: Readonly<Record<string, unknown>>,
  ): void {
    const payload: StructuredLog = {
      ts: new Date().toISOString(),
      level,
      node: this.nodeId,
      event,
      decisionId,
      stateHash: shortStateHash(state),
      details,
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(payload));
  }
}
