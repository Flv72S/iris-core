import type { ComplianceDecision } from '../../distributed/cluster_compliance_engine';

export interface NetworkFaultConfig {
  readonly dropRate: number;
  readonly duplicationRate: number;
  readonly delayMs: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withNetworkFaults(
  config: NetworkFaultConfig,
  send: () => Promise<boolean>,
  seed: number,
): Promise<boolean> {
  let x = seed | 0;
  const next = (): number => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
  if (next() < config.dropRate) return true;
  await sleep(config.delayMs);
  const first = await send();
  if (next() < config.duplicationRate) {
    await sleep(config.delayMs);
    await send();
  }
  return first;
}

/** LCG-style PRNG for deterministic chaos in tests. */
export function createRng(seed: number): () => number {
  let x = seed | 0;
  return (): number => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

export interface ByzantineFaultInjectionConfig {
  readonly seed: number;
  readonly corruptionRate: number;
  readonly truncateRate: number;
  readonly injectInvalidFieldRate: number;
}

/** Flip bits in a JSON string (structure may break → boundary rejects). */
export function corruptJsonString(
  json: string,
  rng: () => number,
  corruptionRate: number,
): string {
  if (rng() >= corruptionRate || json.length === 0) return json;
  const i = Math.min(json.length - 1, Math.floor(rng() * json.length));
  const code = json.charCodeAt(i) ?? 32;
  const flip = String.fromCharCode(code ^ 1);
  return json.slice(0, i) + flip + json.slice(i + 1);
}

/** Truncate JSON to simulate partial TCP / chunked corruption. */
export function partialJsonTruncate(json: string, rng: () => number, truncateRate: number): string {
  if (rng() >= truncateRate || json.length < 8) return json;
  const keep = 1 + Math.floor(rng() * (json.length - 2));
  return json.slice(0, keep);
}

/** Inject unknown top-level fields (codec must reject decisions with extras). */
export function injectUnknownFields(
  json: string,
  rng: () => number,
  rate: number,
): string {
  if (rng() >= rate) return json;
  try {
    const o = JSON.parse(json) as Record<string, unknown>;
    o.__byzantine_probe = rng();
    o[`extra_${(rng() * 1e9) | 0}`] = 'x';
    return JSON.stringify(o);
  } catch {
    return json;
  }
}

/** Full pipeline: truncate → inject fields → bit-flip (order is deterministic for a given rng sequence). */
export function applyPayloadCorruption(
  canonicalJson: string,
  config: ByzantineFaultInjectionConfig,
): string {
  const rng = createRng(config.seed);
  let s = canonicalJson;
  s = partialJsonTruncate(s, rng, config.truncateRate);
  s = injectUnknownFields(s, rng, config.injectInvalidFieldRate);
  s = corruptJsonString(s, rng, config.corruptionRate);
  return s;
}

/** Decision-shaped object with forged id field (must be rejected at codec boundary). */
export function tamperDecisionWithFakeId(decision: ComplianceDecision): Record<string, unknown> {
  return { ...decision, decisionId: 'CMP:FAKE_ID' };
}
