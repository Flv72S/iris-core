/**
 * Recovery Result - risultato immutabile e osservabile
 * Microstep 5.2.3
 */

import type { ReplayMode } from './ReplayCommand';

export interface RecoveryResult {
  readonly mode: ReplayMode;
  readonly timestamp: number;
  readonly attempted: string[];
  readonly recovered: string[];
  readonly failed: string[];
  readonly errors: Readonly<Record<string, string>>;
}

export function createRecoveryResult(
  mode: ReplayMode,
  attempted: string[],
  recovered: string[],
  failed: string[],
  errors: Record<string, string>,
  timestamp = Date.now()
): RecoveryResult {
  return {
    mode,
    timestamp,
    attempted: [...attempted],
    recovered: [...recovered],
    failed: [...failed],
    errors: { ...errors },
  };
}
