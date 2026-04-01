/**
 * Phase 14F — Consensus Coordination Layer. Deterministic proposal state machine.
 */

export enum ConsensusState {
  PROPOSED = 'PROPOSED',
  VOTING = 'VOTING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  FINALIZED = 'FINALIZED',
}

export type ConsensusEvent =
  | 'START_VOTING'
  | 'VOTES_ACCEPTED'
  | 'VOTES_REJECTED'
  | 'FINALIZE';

const TRANSITIONS: Readonly<Record<ConsensusState, Readonly<Partial<Record<ConsensusEvent, ConsensusState>>>>> =
  Object.freeze({
    PROPOSED: Object.freeze({ START_VOTING: ConsensusState.VOTING }),
    VOTING: Object.freeze({
      VOTES_ACCEPTED: ConsensusState.ACCEPTED,
      VOTES_REJECTED: ConsensusState.REJECTED,
    }),
    ACCEPTED: Object.freeze({ FINALIZE: ConsensusState.FINALIZED }),
    REJECTED: Object.freeze({ FINALIZE: ConsensusState.FINALIZED }),
    FINALIZED: Object.freeze({}),
  });

export class ConsensusStateMachine {
  transition(current: ConsensusState, event: ConsensusEvent): ConsensusState {
    const next = TRANSITIONS[current]?.[event];
    return next ?? current;
  }
}
