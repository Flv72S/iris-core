import { createActionOutcome } from '../../../phase-8-feedback/outcome/model/outcome.factory';

const base = {
  actionIntentId: 'intent-1',
  source: 'EXECUTION_RUNTIME' as const,
  timestamp: 1000,
};

export function createCertificationOutcomes() {
  return [
    createActionOutcome({ ...base, id: 'out-1', status: 'SUCCESS' }),
    createActionOutcome({ ...base, id: 'out-2', status: 'SUCCESS' }),
    createActionOutcome({ ...base, id: 'out-3', status: 'FAILED' }),
  ];
}

export function createAllSuccessOutcomes() {
  return [
    createActionOutcome({ ...base, id: 's1', status: 'SUCCESS' }),
    createActionOutcome({ ...base, id: 's2', status: 'SUCCESS' }),
  ];
}
