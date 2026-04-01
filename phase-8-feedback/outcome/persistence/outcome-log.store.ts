import type { ActionOutcome } from '../model/outcome.types';
import type { OutcomeLogEntry, OutcomeLogSnapshot } from './outcome-log.types';
import { computeCumulativeOutcomeHash, getInitialChainHash } from './outcome-log.hash';

export class OutcomeLogStore {
  private entries: OutcomeLogEntry[] = [];
  private currentHash: string = getInitialChainHash();

  append(outcome: ActionOutcome): OutcomeLogSnapshot {
    const index = this.entries.length;
    const cumulativeHash = computeCumulativeOutcomeHash(this.currentHash, outcome, index);
    const entry: OutcomeLogEntry = Object.freeze({ index, outcome, cumulativeHash });
    this.entries.push(entry);
    this.currentHash = cumulativeHash;
    return this.getSnapshot();
  }

  getSnapshot(): OutcomeLogSnapshot {
    const entries = Object.freeze([...this.entries]) as readonly OutcomeLogEntry[];
    return Object.freeze({ entries, finalHash: this.currentHash });
  }

  reset(): void {
    this.entries = [];
    this.currentHash = getInitialChainHash();
  }
}
