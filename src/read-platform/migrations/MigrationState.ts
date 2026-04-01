/**
 * Migration State - stato osservabile della migrazione
 * Microstep 5.1.3 - Read Side Migration Strategy
 */

export type MigrationStatus = 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface MigrationState {
  readonly status: MigrationStatus;
  readonly fromVersion: string;
  readonly toVersion: string;
  readonly progress: number;
  readonly startedAt?: number;
  readonly completedAt?: number;
  readonly error?: string;
}

const EMPTY: MigrationState = {
  status: 'IDLE',
  fromVersion: 'v1',
  toVersion: 'v2',
  progress: 0,
};

export function createIdleState(fromVersion = 'v1', toVersion = 'v2'): MigrationState {
  return { ...EMPTY, fromVersion, toVersion };
}

export function createRunningState(
  base: MigrationState,
  progress: number,
  startedAt: number
): MigrationState {
  return {
    ...base,
    status: 'RUNNING',
    progress,
    startedAt,
  };
}

export function createCompletedState(
  base: MigrationState,
  completedAt: number
): MigrationState {
  return {
    ...base,
    status: 'COMPLETED',
    progress: 100,
    completedAt,
  };
}

export function createFailedState(
  base: MigrationState,
  error: string,
  completedAt: number
): MigrationState {
  return {
    ...base,
    status: 'FAILED',
    error,
    completedAt,
  };
}
