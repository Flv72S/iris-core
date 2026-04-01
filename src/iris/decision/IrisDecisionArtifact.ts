/**
 * IrisDecisionArtifact — IRIS 11.1
 * Artefatto decisionale dichiarativo. Solo descrittivo; nessun execute/apply/action/trigger/command/instruction.
 */

export interface IrisDecisionArtifact {
  readonly id: string;
  readonly decisionType: string;
  readonly inputs: readonly string[];
  readonly statement: string;
  readonly rationale?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly derivedAt: string;
}
