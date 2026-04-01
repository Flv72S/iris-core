/**
 * Step 8L — Ledger integrity detector. Hash chain and timestamp order.
 */

import type { GovernanceLedger } from '../../ledger/types/ledger_types.js';
import { verifyLedger } from '../../ledger/verify/ledger_verifier.js';
import { createGovernanceAlert } from '../types/governance_alert.js';
import type { GovernanceAlert } from '../types/governance_alert.js';

/**
 * If ledger verification fails or timestamps are out of order, generate LEDGER_INTEGRITY_FAILURE.
 */
export function detectLedgerIntegrityIssues(ledger: GovernanceLedger): GovernanceAlert[] {
  const alerts: GovernanceAlert[] = [];
  if (!verifyLedger(ledger)) {
    alerts.push(
      createGovernanceAlert(
        'LEDGER_INTEGRITY_FAILURE',
        'CRITICAL',
        'Governance ledger hash chain or index verification failed'
      )
    );
    return alerts;
  }
  const entries = ledger.entries;
  for (let i = 1; i < entries.length; i++) {
    const prev = entries[i - 1]!;
    const curr = entries[i]!;
    if (curr.timestamp < prev.timestamp) {
      alerts.push(
        createGovernanceAlert(
          'LEDGER_INTEGRITY_FAILURE',
          'CRITICAL',
          'Ledger entries timestamp order violated',
          curr.ledger_hash,
          String(curr.index)
        )
      );
    }
  }
  return alerts;
}
