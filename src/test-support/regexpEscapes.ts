/**
 * Escape a string for safe use as a RegExp source (RegExp constructor, not literal).
 */
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Match a forbidden path segment inside an import line (e.g. `/execution/`), avoiding
 * false positives like `NoExecutionGuarantee` from a bare `/execution/i` substring match.
 */
export function forbiddenImportPathSegmentRegex(segment: string): RegExp {
  const esc = escapeRegExp(segment);
  if (segment.includes('/') || segment.includes('.')) {
    return new RegExp(esc, 'i');
  }
  return new RegExp(`/${esc}/`, 'i');
}
