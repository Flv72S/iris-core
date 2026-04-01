/**
 * Memory zeroization for PFS material (16F.X5.X6.HARDENING — Section 4).
 * Use in finally blocks so buffers are cleared on all paths.
 */
export function secureZero(buf?: Buffer | null): void {
  if (!buf) return;
  buf.fill(0);
}
