/**
 * Microstep 15C — Encryption Layer. Session encryption context.
 *
 * Note: this is an in-memory context keyed by `session_id`.
 * The private ephemeral key material must be removed when the secure session expires.
 */

import type { EncryptionSession } from './encryption_types.js';

export type { EncryptionSession };

