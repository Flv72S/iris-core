/**
 * S-2 — Censorship: deterministic drop by message type and id.
 */

export interface CensorshipRule {
  readonly messageTypePattern: string;
  readonly dropPercent: number;
}

export function shouldCensor(
  messageType: string,
  messageId: string,
  tick: bigint,
  rules: readonly CensorshipRule[],
  _rng: { nextInt: (n: number) => number },
): boolean {
  for (const r of rules) {
    if (messageType !== r.messageTypePattern) continue;
    const h = (messageId + String(tick)).split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0);
    if (Math.abs(h % 100) < r.dropPercent) return true;
  }
  return false;
}
