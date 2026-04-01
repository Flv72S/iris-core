/**
 * Step 8A — API key guard. Requires X-IRIS-API-KEY header.
 */

export const IRIS_API_KEY_HEADER = 'x-iris-api-key';

export interface ApiKeyGuardResult {
  allowed: boolean;
  callerId?: string;
  reason?: string;
}

/**
 * Validates API key from request headers. Returns allowed + optional caller_id.
 * Key is valid if non-empty; caller_id defaults to key prefix (first 8 chars) for audit.
 */
export function apiKeyGuard(apiKey: string | undefined): ApiKeyGuardResult {
  if (apiKey === undefined || apiKey === '') {
    return { allowed: false, reason: 'Missing or empty X-IRIS-API-KEY' };
  }
  const callerId = apiKey.length >= 8 ? apiKey.slice(0, 8) : apiKey;
  return { allowed: true, callerId };
}
