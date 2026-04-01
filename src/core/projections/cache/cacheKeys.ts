/**
 * Key format for projection cache (must match Cached*ReadProjection).
 * Used by wiring for invalidation.
 */
export function buildCacheKey(method: string, args: unknown[]): string {
  return `${method}:${JSON.stringify(args)}`;
}
