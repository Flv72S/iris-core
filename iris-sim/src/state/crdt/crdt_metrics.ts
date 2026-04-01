export type CRDTMetrics = {
  operationsApplied: number;
  operationsRejected: number;
  conflictsResolved: number;
  stateSize: number;
  convergenceRate: number;
};

const metrics: CRDTMetrics = {
  operationsApplied: 0,
  operationsRejected: 0,
  conflictsResolved: 0,
  stateSize: 0,
  convergenceRate: 0,
};

export function incCRDTMetric<K extends keyof CRDTMetrics>(k: K, n = 1): void {
  metrics[k] += n;
}

export function setCRDTMetric<K extends keyof CRDTMetrics>(k: K, v: number): void {
  metrics[k] = v;
}

export function getCRDTMetricsSnapshot(): CRDTMetrics {
  return { ...metrics };
}

