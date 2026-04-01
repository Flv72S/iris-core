/**
 * ThreadReadModel v1 — struttura minimale
 * Microstep 5.1.2 — Read Model Versioning
 */

import type { ThreadId } from '../ids';

export type ThreadReadModelV1 = Readonly<{
  id: ThreadId;
  title: string;
  archived: boolean;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}>;
