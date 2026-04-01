/**
 * Microstep 16A — IRIS SDK events.
 */

export type IrisEvent =
  | 'node:starting'
  | 'node:ready'
  | 'node:stopped'
  | 'message'
  | 'session:open'
  | 'session:close'
  | 'error';

