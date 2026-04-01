/**
 * ExecutionResult — Esito esecuzione. Mutuamente esclusivo.
 */

export type ExecutionResult =
  | { readonly status: 'EXECUTED'; readonly executedAt: number }
  | { readonly status: 'SKIPPED'; readonly reason: string }
  | { readonly status: 'BLOCKED'; readonly reason: string };
