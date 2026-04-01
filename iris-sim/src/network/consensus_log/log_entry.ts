import type { ConsensusLogEntryType } from './log_types.js';

export interface ConsensusLogEntry {
  id: string;
  type: ConsensusLogEntryType;
  timestamp: number;
  payload: unknown;
  previous_hash: string | null;
  hash: string;
}

