/**
 * Step 8J — Trust Anchor Registry. Public root key fingerprint for external verification.
 */

import {
  IRIS_ROOT_KEY_ID,
  IRIS_ROOT_PUBLIC_KEY_HASH,
} from '../key/iris_root_key.js';
import type { IRISRootKey } from '../types/trust_anchor_types.js';

const ALGORITHM = 'IRIS_SHA256_ROOT';

export const TRUST_ANCHOR_REGISTRY: {
  readonly root: IRISRootKey;
} = Object.freeze({
  root: Object.freeze({
    key_id: IRIS_ROOT_KEY_ID,
    algorithm: ALGORITHM,
    public_key_hash: IRIS_ROOT_PUBLIC_KEY_HASH,
  }),
});
