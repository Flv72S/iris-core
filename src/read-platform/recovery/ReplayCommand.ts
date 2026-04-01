/**
 * Replay Command - intenzione esplicita di recovery
 * Microstep 5.2.3
 */

export type ReplayMode = 'DRY_RUN' | 'EXECUTE';

export type ReplayProvenance =
  | { source: 'DLQ'; eventIds?: string[] }
  | { source: 'EVENT_IDS'; eventIds: string[] }
  | { source: 'TIME_RANGE'; fromTimestamp: number; toTimestamp?: number };

export interface ReplayCommand {
  readonly provenance: ReplayProvenance;
  readonly targetVersion: string;
  readonly mode: ReplayMode;
}
