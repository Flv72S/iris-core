/**
 * Migration Strategy - come avviene la migrazione
 * Microstep 5.1.3 - Read Side Migration Strategy
 */

export type MigrationStrategyType = 'FULL_REPLAY' | 'TIMEBOX_REPLAY';

export interface MigrationStrategy {
  readonly type: MigrationStrategyType;
  readonly fromTimestamp?: string;
  readonly toTimestamp?: string;
}

export function fullReplay(): MigrationStrategy {
  return { type: 'FULL_REPLAY' };
}

export function timeboxReplay(
  fromTimestamp: string,
  toTimestamp?: string
): MigrationStrategy {
  return {
    type: 'TIMEBOX_REPLAY',
    fromTimestamp,
    toTimestamp,
  };
}
