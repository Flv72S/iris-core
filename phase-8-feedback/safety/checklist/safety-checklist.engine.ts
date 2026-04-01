/**
 * Phase 8 — Safety Checklist Engine
 *
 * Esegue tutte le check rules, produce risultato congelato e deterministico.
 * Nessun import da Phase 7 runtime; solo tipi/report già certificati.
 */

import type {
  SafetyChecklistResult,
  SafetyCheckResult,
  Phase7BoundaryReport,
  Phase8ExecutionMetadata,
  ReplayResult,
} from './safety-checklist.types';
import {
  checkNoSignalLayerWrite,
  checkNoPreferenceMutation,
  checkNoImplicitLearning,
  checkDeterministicOutput,
  checkReplaySafe,
  checkStateIsolated,
  checkPhase7BoundaryPreserved,
  getCheckOrder,
} from './safety-checklist.rules';

export interface RunSafetyChecklistInput {
  readonly checklistVersion: string;
  readonly timestamp: string;
  readonly boundaryReport: Phase7BoundaryReport;
  readonly executionMetadata: Phase8ExecutionMetadata;
  readonly replayResult?: ReplayResult;
}

export function runSafetyChecklist(input: RunSafetyChecklistInput): SafetyChecklistResult {
  const { boundaryReport, executionMetadata, replayResult } = input;
  const order = getCheckOrder();
  const results: SafetyChecklistResult['results'] = [
    checkNoSignalLayerWrite({ boundaryReport }),
    checkNoPreferenceMutation({ boundaryReport }),
    checkNoImplicitLearning({ boundaryReport }),
    checkDeterministicOutput({ executionMetadata }),
    checkReplaySafe({ replayResult }),
    checkStateIsolated({ executionMetadata }),
    checkPhase7BoundaryPreserved({ boundaryReport }),
  ];
  const fullySafe = order.every(
    (id) => results.find((r) => r.checkId === id)?.passed === true
  );
  const out: SafetyChecklistResult = Object.freeze({
    checklistVersion: input.checklistVersion,
    timestamp: input.timestamp,
    results: Object.freeze([...results]) as readonly SafetyCheckResult[],
    fullySafe,
  });
  return out;
}
