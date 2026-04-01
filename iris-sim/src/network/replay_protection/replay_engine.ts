/**
 * Microstep 15D — Distributed Replay Protection. Engine.
 */

import type { MessageEnvelope } from '../message_envelope/message_envelope_types.js';
import { ReplayNonceStore } from './replay_nonce_store.js';
import type { ReplayValidationConfig } from './replay_types.js';
import { replayIdentifierFromEnvelope } from './replay_types.js';
import { ReplayValidator } from './replay_validator.js';
import type { ReplayDistributionEngine } from './replay_distribution.js';

export class ReplayProtectionEngine {
  private readonly store: ReplayNonceStore;
  private readonly validator: ReplayValidator;
  private readonly distribution: ReplayDistributionEngine | undefined;

  constructor(args?: {
    store?: ReplayNonceStore;
    validator?: ReplayValidator;
    distribution?: ReplayDistributionEngine;
    validation_config?: ReplayValidationConfig;
  }) {
    this.store = args?.store ?? new ReplayNonceStore();
    this.validator = args?.validator ?? new ReplayValidator(this.store, args?.validation_config);
    this.distribution = args?.distribution;
  }

  processEnvelope(envelope: MessageEnvelope): void {
    const identifier = replayIdentifierFromEnvelope(envelope);
    this.validator.validate(identifier);
    this.store.add(identifier);
    this.distribution?.broadcast(identifier);
  }
}
