/**
 * Step 8A — Governance API Controller. Validates input, calls service, formats DTO + metadata.
 */

import type { GovernanceQueryService } from '../services/governance_query_service.js';

const DEFAULT_HISTORY_LIMIT = 50;
const MAX_HISTORY_LIMIT = 500;

export interface GovernanceControllerResult {
  status: number;
  body: unknown;
  responseHash?: string;
}

/** Optional handler for GET /governance/state-at (Step 8H Time Machine). */
export type StateAtHandler = (
  timestampMs: number
) => { timestamp: number; governanceState: unknown; replayedEvents: unknown[] } | null;

export class GovernanceController {
  constructor(
    private readonly _service: GovernanceQueryService,
    private readonly _stateAtHandler?: StateAtHandler
  ) {}

  getTier(): GovernanceControllerResult {
    const body = this._service.getTierStatus();
    if (!body) {
      return { status: 404, body: { error: 'No tier snapshot available' } };
    }
    return { status: 200, body, responseHash: body.response_hash };
  }

  getCertificate(): GovernanceControllerResult {
    const body = this._service.getCertificate();
    if (!body) {
      return { status: 404, body: { error: 'No certificate available' } };
    }
    return { status: 200, body, responseHash: body.response_hash };
  }

  getSLA(): GovernanceControllerResult {
    const body = this._service.getSLA();
    if (!body) {
      return { status: 404, body: { error: 'No SLA profile available' } };
    }
    return { status: 200, body, responseHash: body.response_hash };
  }

  getSnapshot(): GovernanceControllerResult {
    const body = this._service.getSnapshot();
    if (!body) {
      return { status: 404, body: { error: 'No snapshot available' } };
    }
    return { status: 200, body, responseHash: body.response_hash };
  }

  getHistory(params: { limit?: number; from_timestamp?: number }): GovernanceControllerResult {
    const limit = Math.min(
      Math.max(1, Math.floor(Number(params.limit)) || DEFAULT_HISTORY_LIMIT),
      MAX_HISTORY_LIMIT
    );
    const fromTimestamp =
      params.from_timestamp !== undefined ? Math.max(0, Math.floor(Number(params.from_timestamp))) : undefined;
    const body = this._service.getHistory(limit, fromTimestamp);
    return { status: 200, body, responseHash: body.response_hash };
  }

  /** GET /governance/state-at?timestamp= (Step 8H). Returns 501 if Time Machine not configured. */
  getStateAt(params: { timestamp?: string }): GovernanceControllerResult {
    if (!this._stateAtHandler) {
      return { status: 501, body: { error: 'Governance Time Machine not configured' } };
    }
    const raw = params.timestamp;
    if (raw === undefined || raw === '') {
      return { status: 400, body: { error: 'Missing timestamp parameter' } };
    }
    const timestampMs = Number.isFinite(Number(raw)) ? Number(raw) : Date.parse(raw);
    if (!Number.isFinite(timestampMs)) {
      return { status: 400, body: { error: 'Invalid timestamp' } };
    }
    const result = this._stateAtHandler(timestampMs);
    if (!result) {
      return { status: 404, body: { error: 'No governance state at requested time' } };
    }
    return { status: 200, body: result };
  }
}
