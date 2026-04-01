/**
 * Phase 13XX-A — Node Identity & Registration Layer. Deterministic verification.
 * No network calls. Verification depends on IdentityTrustLevel.
 */

import type { NodeIdentity, IdentityTrustLevel } from './node_identity_types.js';
import { isValidNodeType } from './node_identity_types.js';
import { NodeIdentityError, NodeIdentityErrorCode } from './node_identity_errors.js';

/** Default whitelist for HIGH trust (deterministic; extend via constructor). */
const DEFAULT_HIGH_TRUST_PROVIDERS = new Set<string>([
  'OpenAI',
  'Anthropic',
  'IRIS_INTERNAL',
  'SYSTEM',
]);

export class NodeIdentityVerifier {
  private readonly highTrustProviders: ReadonlySet<string>;

  constructor(highTrustProviders?: ReadonlySet<string>) {
    this.highTrustProviders = highTrustProviders ?? DEFAULT_HIGH_TRUST_PROVIDERS;
  }

  /**
   * Verify identity for the given trust level. Deterministic; no I/O.
   */
  verifyIdentity(identity: NodeIdentity, level: IdentityTrustLevel): boolean {
    if (identity == null || typeof identity !== 'object') return false;
    if (typeof identity.node_id !== 'string' || identity.node_id.length === 0) {
      throw new NodeIdentityError('node_id is required and must be non-empty', NodeIdentityErrorCode.MISSING_REQUIRED_FIELDS);
    }
    if (!isValidNodeType(identity.node_type as string)) {
      throw new NodeIdentityError(`Invalid node_type: ${identity.node_type}`, NodeIdentityErrorCode.INVALID_NODE_TYPE);
    }

    if (level === 'LOW') return true;

    if (typeof identity.provider !== 'string' || identity.provider.length === 0) {
      throw new NodeIdentityError('provider is required for MEDIUM/HIGH trust', NodeIdentityErrorCode.MISSING_REQUIRED_FIELDS);
    }

    if (level === 'MEDIUM') return true;

    if (typeof identity.public_key !== 'string' || identity.public_key.length === 0) {
      throw new NodeIdentityError('public_key is required for HIGH trust', NodeIdentityErrorCode.MISSING_REQUIRED_FIELDS);
    }
    if (!this.highTrustProviders.has(identity.provider)) {
      throw new NodeIdentityError(`Provider not in whitelist: ${identity.provider}`, NodeIdentityErrorCode.UNVERIFIED_PROVIDER);
    }
    return true;
  }
}
