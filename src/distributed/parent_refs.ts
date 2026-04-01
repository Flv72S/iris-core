/**
 * 16F.6.B.HARDENING — Normalized parent references (legacy + multi-parent).
 */
import type { DistributedEvent } from './global_input';
import { DistributedInputValidationError } from './errors';

/**
 * Lexicographically sorted, unique parent ids.
 * Legacy `parentEventId` is merged with `parentEventIds`; if both are set, `parentEventId` must appear in `parentEventIds`.
 */
export function normalizeParentEventIds(event: Pick<DistributedEvent, 'parentEventId' | 'parentEventIds'>): readonly string[] {
  const fromArr = event.parentEventIds ?? [];
  const fromLegacy = event.parentEventId !== undefined ? [event.parentEventId] : [];

  for (const p of [...fromArr, ...fromLegacy]) {
    if (typeof p !== 'string' || p.length === 0) {
      throw new DistributedInputValidationError('parent reference must be a non-empty string');
    }
  }

  if (event.parentEventIds !== undefined) {
    const u = new Set(event.parentEventIds);
    if (u.size !== event.parentEventIds.length) {
      throw new DistributedInputValidationError('parentEventIds must not contain duplicates');
    }
  }

  if (event.parentEventId !== undefined && event.parentEventIds !== undefined) {
    const setArr = new Set(event.parentEventIds);
    if (!setArr.has(event.parentEventId)) {
      throw new DistributedInputValidationError(
        'when both parentEventId and parentEventIds are set, parentEventId must be included in parentEventIds',
        [`parentEventId=${event.parentEventId}`],
      );
    }
  }

  const merged = [...new Set([...fromArr, ...fromLegacy])].sort((a, b) => a.localeCompare(b));
  return merged;
}
