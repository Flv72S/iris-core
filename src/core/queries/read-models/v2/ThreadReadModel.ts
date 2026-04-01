/**
 * ThreadReadModel v2 — esteso con campi aggiuntivi
 * Microstep 5.1.2 — Read Model Versioning
 *
 * v2 aggiunge slug per URL-friendly lookup.
 * Nessun breaking change su v1.
 */

import type { ThreadId } from '../ids';

export type ThreadReadModelV2 = Readonly<{
  id: ThreadId;
  title: string;
  archived: boolean;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
  /** v2: slug per URL-friendly routing */
  slug?: string;
}>;
