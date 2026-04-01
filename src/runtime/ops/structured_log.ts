import type { LogLevel } from './log_levels';

export interface StructuredLog {
  readonly ts: string;
  readonly level: LogLevel;
  readonly node: string;
  readonly event: string;
  readonly decisionId?: string;
  readonly stateHash: string;
  readonly details?: Readonly<Record<string, unknown>>;
}
