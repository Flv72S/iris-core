/**
 * S-1 — Deterministic logical node. All communication via DeterministicNetwork.
 */

import type { NodeState, SimulatedMessage, BehaviorProfile } from './NodeTypes.js';

export type SendMessageFn = (message: SimulatedMessage) => void;

export class SimulatedNode {
  readonly nodeId: string;
  readonly clusterId: string;
  private _state: NodeState;
  private _isAlive: boolean;
  private _behaviorProfile: BehaviorProfile;
  private _sendFn: SendMessageFn | null = null;
  private _messageCounter: number = 0;

  constructor(nodeId: string, clusterId: string, initialState: NodeState = {}) {
    this.nodeId = nodeId;
    this.clusterId = clusterId;
    this._state = Object.freeze({ ...initialState });
    this._isAlive = true;
    this._behaviorProfile = 'honest';
  }

  setSendFn(fn: SendMessageFn): void {
    this._sendFn = fn;
  }

  get state(): NodeState {
    return this._state;
  }

  get isAlive(): boolean {
    return this._isAlive;
  }

  get behaviorProfile(): BehaviorProfile {
    return this._behaviorProfile;
  }

  receiveMessage(message: SimulatedMessage): void {
    if (!this._isAlive) return;
    this._messageCounter++;
    this._state = Object.freeze({ ...this._state, lastMessage: message, receivedCount: this._messageCounter });
  }

  sendMessage(targetNodeId: string, payload: unknown, messageType: string, tickSent: bigint): void {
    if (!this._isAlive || !this._sendFn) return;
    this._messageCounter++;
    const messageId = this.nodeId + '-' + this._messageCounter + '-' + String(tickSent);
    const message: SimulatedMessage = Object.freeze({
      fromNodeId: this.nodeId,
      toNodeId: targetNodeId,
      payload,
      tickSent,
      messageId,
      messageType,
    });
    this._sendFn(message);
  }

  crash(): void {
    this._isAlive = false;
  }

  recover(): void {
    this._isAlive = true;
  }

  injectByzantineBehavior(): void {
    this._behaviorProfile = 'byzantine';
  }

  setHonestBehavior(): void {
    this._behaviorProfile = 'honest';
  }
}
