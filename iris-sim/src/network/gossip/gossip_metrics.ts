export type GossipMetricsSnapshot = {
  messagesReceived: number;
  messagesForwarded: number;
  duplicatesDropped: number;
  rateLimited: number;
  blockedAmplifications: number;
  inflightLimitExceeded: number;
  policyViolations: number;
  lineageInvalid: number;
  replayDetected: number;
  convergenceStalled: number;
};

export type GossipDebugSnapshot = {
  peersCount: number;
  activePeers: number;
};

const metrics: GossipMetricsSnapshot = {
  messagesReceived: 0,
  messagesForwarded: 0,
  duplicatesDropped: 0,
  rateLimited: 0,
  blockedAmplifications: 0,
  inflightLimitExceeded: 0,
  policyViolations: 0,
  lineageInvalid: 0,
  replayDetected: 0,
  convergenceStalled: 0,
};

let lastDebug: GossipDebugSnapshot | null = null;

export function incGossipMetric<K extends keyof GossipMetricsSnapshot>(key: K, n = 1): void {
  metrics[key] += n;
}

export function getGossipMetricsSnapshot(): GossipMetricsSnapshot {
  return { ...metrics };
}

export function setGossipDebugSnapshot(s: GossipDebugSnapshot): void {
  lastDebug = { ...s };
}

export function getGossipDebugSnapshot(): GossipDebugSnapshot | null {
  return lastDebug ? { ...lastDebug } : null;
}

let gossipControlStats = { inflight: 0, blockedAmplifications: 0, fanoutAverage: 0 };
let gossipConsistencyStats = { convergenceRate: 0, partialMessages: 0 };

export function setGossipControlStats(s: { inflight: number; blockedAmplifications: number; fanoutAverage: number }): void {
  gossipControlStats = { ...s };
}

export function getGossipControlStats(): { inflight: number; blockedAmplifications: number; fanoutAverage: number } {
  return { ...gossipControlStats };
}

export function setGossipConsistencyStats(s: { convergenceRate: number; partialMessages: number }): void {
  gossipConsistencyStats = { ...s };
}

export function getGossipConsistencyStats(): { convergenceRate: number; partialMessages: number } {
  return { ...gossipConsistencyStats };
}

