/**
 * Microstep 16A — IRIS modules wrapper types.
 */

import type { Transport } from '../network/transport/transport_interface.js';
import type { SessionManager } from '../network/secure_session/index.js';
import type { MessageEnvelopeSigner, MessageEnvelopeValidator } from '../network/message_envelope/index.js';
import type { EncryptionEngine } from '../network/encryption/index.js';
import type { ReplayProtectionEngine } from '../network/replay_protection/index.js';
import type { CovenantRuntimeEngine } from '../network/covenant_runtime/index.js';

export type MessageEnvelopeService = {
  signer: MessageEnvelopeSigner;
  validator: MessageEnvelopeValidator;
};

export type IrisModules = {
  transport: Transport;
  session: SessionManager;
  messaging: MessageEnvelopeService;
  encryption?: EncryptionEngine;
  replay?: ReplayProtectionEngine;
  covenants?: CovenantRuntimeEngine;
};

