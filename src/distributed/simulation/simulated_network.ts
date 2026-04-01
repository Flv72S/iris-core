import type { Message, NetworkEnvelope } from './message_types';

function createSeeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x1_0000_0000;
  };
}

export interface NetworkConfig {
  readonly lossRate: number;
  readonly duplicationRate: number;
  readonly maxDelayTicks: number;
  readonly reorderBuffer: number;
  readonly seed: number;
}

export class SimulatedNetwork {
  private readonly rand: () => number;
  private readonly config: NetworkConfig;
  private queue: NetworkEnvelope[];
  private tickNow: number;
  private blockedPairs: Set<string>;

  constructor(config: NetworkConfig) {
    this.config = config;
    this.rand = createSeeded(config.seed);
    this.queue = [];
    this.tickNow = 0;
    this.blockedPairs = new Set();
  }

  private pairKey(from: string, to: string): string {
    return `${from}->${to}`;
  }

  partition(groups: readonly (readonly string[])[]): void {
    this.blockedPairs.clear();
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        for (const a of groups[i]!) {
          for (const b of groups[j]!) {
            this.blockedPairs.add(this.pairKey(a, b));
            this.blockedPairs.add(this.pairKey(b, a));
          }
        }
      }
    }
  }

  heal(): void {
    this.blockedPairs.clear();
  }

  send(from: string, to: string, message: Message): void {
    if (this.blockedPairs.has(this.pairKey(from, to))) return;
    if (this.rand() < this.config.lossRate) return;
    const delay = Math.floor(this.rand() * (this.config.maxDelayTicks + 1));
    const env: NetworkEnvelope = Object.freeze({
      message,
      toNodeId: to,
      deliverAtTick: this.tickNow + delay,
    });
    this.queue.push(env);
    if (this.rand() < this.config.duplicationRate) {
      this.queue.push(Object.freeze({ ...env }));
    }
  }

  broadcast(from: string, toNodes: readonly string[], message: Message): void {
    for (const to of toNodes) {
      if (to === from) continue;
      this.send(from, to, message);
    }
  }

  tick(): NetworkEnvelope[] {
    this.tickNow += 1;
    // deterministic pseudo-reorder by limited random swaps
    const swaps = Math.min(this.config.reorderBuffer, this.queue.length);
    for (let i = 0; i < swaps; i++) {
      const a = Math.floor(this.rand() * this.queue.length);
      const b = Math.floor(this.rand() * this.queue.length);
      [this.queue[a], this.queue[b]] = [this.queue[b]!, this.queue[a]!];
    }
    const due = this.queue
      .filter((e) => e.deliverAtTick <= this.tickNow)
      .sort((a, b) => a.message.id.localeCompare(b.message.id));
    this.queue = this.queue.filter((e) => e.deliverAtTick > this.tickNow);
    return due;
  }

  hasPendingMessages(): boolean {
    return this.queue.length > 0;
  }
}
