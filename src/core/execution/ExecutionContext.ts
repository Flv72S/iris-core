/**
 * ExecutionContext — Input per guardrails e engine. Read-only.
 */

import type { ExecutionKillSwitchRegistry } from './kill-switch/ExecutionKillSwitch';

export interface ExecutionAuditEntryRef {
  readonly actionId: string;
  readonly sourceFeature: string;
  readonly requestedAt: number;
  readonly result: { readonly status: string };
}

export interface ExecutionContext {
  readonly now: number;
  readonly registry: ExecutionKillSwitchRegistry;
  readonly getRecentEntries: () => readonly ExecutionAuditEntryRef[];
  readonly wellbeingBlocked: boolean;
}
