/**
 * S-2 — Deterministic system metrics collector.
 */

export interface SystemMetrics {
  readonly messagesSent: number;
  readonly messagesDelivered: number;
  readonly messagesDropped: number;
  readonly activeNodes: number;
  readonly crashedNodes: number;
  readonly partitionCount: number;
  readonly maxQueueDepth: number;
  readonly eventThroughputLastTick: number;
  readonly byzantineActionCount: number;
  readonly tick: string;
}

export class SystemMetricsCollector {
  private _messagesSent = 0;
  private _messagesDelivered = 0;
  private _messagesDropped = 0;
  private _activeNodes = 0;
  private _crashedNodes = 0;
  private _partitionCount = 0;
  private _maxQueueDepth = 0;
  private _eventThroughputLastTick = 0;
  private _byzantineActionCount = 0;

  setNetworkStats(delivered: number, dropped: number): void {
    this._messagesDelivered = delivered;
    this._messagesDropped = dropped;
  }

  setNodeCounts(active: number, crashed: number): void {
    this._activeNodes = active;
    this._crashedNodes = crashed;
  }

  setPartitionCount(n: number): void {
    this._partitionCount = n;
  }

  setQueueDepth(d: number): void {
    if (d > this._maxQueueDepth) this._maxQueueDepth = d;
  }

  setEventThroughput(n: number): void {
    this._eventThroughputLastTick = n;
  }

  addMessagesSent(n: number): void {
    this._messagesSent += n;
  }

  addByzantineAction(): void {
    this._byzantineActionCount++;
  }

  snapshot(tick: bigint): SystemMetrics {
    return Object.freeze({
      messagesSent: this._messagesSent,
      messagesDelivered: this._messagesDelivered,
      messagesDropped: this._messagesDropped,
      activeNodes: this._activeNodes,
      crashedNodes: this._crashedNodes,
      partitionCount: this._partitionCount,
      maxQueueDepth: this._maxQueueDepth,
      eventThroughputLastTick: this._eventThroughputLastTick,
      byzantineActionCount: this._byzantineActionCount,
      tick: String(tick),
    });
  }

  reset(): void {
    this._messagesSent = 0;
    this._messagesDelivered = 0;
    this._messagesDropped = 0;
    this._activeNodes = 0;
    this._crashedNodes = 0;
    this._partitionCount = 0;
    this._maxQueueDepth = 0;
    this._eventThroughputLastTick = 0;
    this._byzantineActionCount = 0;
  }
}
