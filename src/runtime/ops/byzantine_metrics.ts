/** Process-local counters for boundary rejections (Byzantine / malformed input). */

let invalidDecisionsRejected = 0;
let corruptedMessagesHandled = 0;
let stateSyncRejected = 0;

export function resetByzantineMetrics(): void {
  invalidDecisionsRejected = 0;
  corruptedMessagesHandled = 0;
  stateSyncRejected = 0;
}

export function recordInvalidDecisionRejected(): void {
  invalidDecisionsRejected += 1;
}

export function recordCorruptedMessageHandled(): void {
  corruptedMessagesHandled += 1;
}

export function recordStateSyncRejected(): void {
  stateSyncRejected += 1;
}

export function snapshotByzantineMetrics(): Readonly<{
  invalidDecisionsRejected: number;
  corruptedMessagesHandled: number;
  stateSyncRejected: number;
  /** Reserved for harness-level reporting; always 0 on the HTTP boundary. */
  forksResolved: number;
}> {
  return Object.freeze({
    invalidDecisionsRejected,
    corruptedMessagesHandled,
    stateSyncRejected,
    forksResolved: 0,
  });
}
