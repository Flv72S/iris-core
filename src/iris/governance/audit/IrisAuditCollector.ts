/**
 * IrisAuditCollector — IRIS 10.0.2
 * Aggrega snapshot governance e kill-switch + presenza output IRIS. Puro, deterministico, side-effect free.
 * Non legge contenuti; solo presenza/assenza.
 */

import type { IrisGovernanceSnapshot } from '../IrisGovernanceSnapshot';
import type { IrisKillSwitchSnapshot } from '../binding/IrisKillSwitchSnapshot';
import type { IrisInterpretationModel } from '../../../interpretation';
import type { IrisOrchestrationResult } from '../../../orchestration';
import type { IrisMessageBinding } from '../../../messaging';
import type { IrisRenderResult } from '../../../rendering';
import type { IrisAuditEntry, IrisAuditEntryType } from './IrisAuditEntry';
import type { IrisAuditSnapshot } from './IrisAuditSnapshot';

/** Hash deterministico da oggetto (solo per snapshotHash). */
function deterministicHash(obj: unknown): string {
  const str = JSON.stringify(obj);
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16);
}

export interface IrisAuditCollectorInput {
  readonly governanceSnapshot: IrisGovernanceSnapshot;
  readonly killSwitchSnapshot: IrisKillSwitchSnapshot;
  readonly interpretationModel?: IrisInterpretationModel | null;
  readonly orchestrationResults?: readonly IrisOrchestrationResult[] | null;
  readonly bindings?: readonly IrisMessageBinding[] | null;
  readonly renderResults?: readonly IrisRenderResult[] | null;
}

export interface IrisAuditCollectorOptions {
  readonly computeHash?: boolean;
}

export class IrisAuditCollector {
  /**
   * Produce snapshot audit frozen. Solo presenza; nessuna lettura di contenuti.
   */
  collect(
    input: IrisAuditCollectorInput,
    options?: IrisAuditCollectorOptions
  ): IrisAuditSnapshot {
    const derivedAt = new Date().toISOString();

    const entry = (
      id: string,
      type: IrisAuditEntryType,
      present: boolean
    ): IrisAuditEntry =>
      Object.freeze({
        id,
        type,
        present,
        derivedAt,
      });

    const entries: IrisAuditEntry[] = [
      entry('governance', 'governance', input.governanceSnapshot != null),
      entry('kill-switch', 'kill-switch', input.killSwitchSnapshot != null),
      entry(
        'interpretation',
        'interpretation',
        input.interpretationModel != null
      ),
      entry(
        'orchestration',
        'orchestration',
        input.orchestrationResults != null
      ),
      entry('messaging', 'messaging', input.bindings != null),
      entry('rendering', 'rendering', input.renderResults != null),
    ];

    const frozenEntries = Object.freeze(entries.map((e) => Object.freeze({ ...e })));
    const governanceVersion = input.governanceSnapshot.version;

    let snapshotHash: string | undefined;
    if (options?.computeHash) {
      const sorted = [...frozenEntries].sort((a, b) =>
        a.type.localeCompare(b.type)
      );
      snapshotHash = deterministicHash(sorted.map((e) => ({ type: e.type, present: e.present })));
    }

    return Object.freeze({
      entries: frozenEntries,
      ...(governanceVersion != null && { governanceVersion }),
      derivedAt,
      ...(snapshotHash != null && { snapshotHash }),
    });
  }
}
