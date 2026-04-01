// H9 - Gate engine. Blocks on violations; deterministic.

import 'meta_governance_diff_analyzer.dart';
import 'meta_governance_ci_context.dart';
import 'meta_governance_report.dart';
import 'meta_governance_violation.dart';

class MetaGovernanceGateEngine {
  MetaGovernanceGateEngine._();

  static MetaGovernanceReport evaluate({
    required MetaGovernanceDiffResult diffResult,
    required MetaGovernanceCIContext context,
  }) {
    final violations = <MetaGovernanceViolation>[];

    if (!diffResult.hasRelevantChanges) {
      return MetaGovernanceReport(violations: violations);
    }

    if (diffResult.hasMetaGovernanceLibChanges && context.hasStructuralChange) {
      if (!context.hasValidGcp) {
        violations.add(MetaGovernanceViolation(
          id: 'H9-G1',
          rule: 'GCP_PRESENCE',
          description: 'Structural meta-governance change requires a valid GCP',
          suggestedFix: 'Add or link a valid GCP for this change',
          severity: MetaGovernanceViolationSeverity.error,
        ));
      }

      if (context.hasValidGcp && !context.hasImpactReport) {
        violations.add(MetaGovernanceViolation(
          id: 'H9-G2',
          rule: 'IMPACT_ANALYSIS_PRESENCE',
          description: 'GCP requires an Impact Report',
          suggestedFix: 'Provide GovernanceImpactReport for the GCP',
          severity: MetaGovernanceViolationSeverity.error,
        ));
      }

      if (!context.hasValidDecisionAndRatification && context.hasValidGcp) {
        violations.add(MetaGovernanceViolation(
          id: 'H9-G3',
          rule: 'DECISION_RATIFICATION_VALIDITY',
          description: 'Decision and ratification must be valid (authority, quorum, version)',
          suggestedFix: 'Ensure valid decision and ratification record',
          severity: MetaGovernanceViolationSeverity.error,
        ));
      }

      if (context.hasActivationSnapshot &&
          (!context.hasGovernanceSnapshot || !context.hasZeroDrift)) {
        violations.add(MetaGovernanceViolation(
          id: 'H9-G4',
          rule: 'ACTIVATION_SNAPSHOT_CONSISTENCY',
          description: 'Activation requires consistent snapshot and zero drift',
          suggestedFix: 'Register snapshot and resolve drift',
          severity: MetaGovernanceViolationSeverity.error,
        ));
      }

      if (context.hasGovernanceSnapshot &&
          !context.hasZeroDrift &&
          context.driftCount > 0) {
        violations.add(MetaGovernanceViolation(
          id: 'H9-G5',
          rule: 'DRIFT_CHECK',
          description: 'Drift must be zero or justified by active GCP',
          suggestedFix: 'Run drift detection and fix or justify drift',
          severity: MetaGovernanceViolationSeverity.error,
        ));
      }

      if (context.hasGovernanceSnapshot && !context.provenanceValid) {
        violations.add(MetaGovernanceViolation(
          id: 'H9-G6',
          rule: 'PROVENANCE_INTEGRITY',
          description: 'Provenance chain must be valid (verifyIntegrity = true)',
          suggestedFix: 'Build and verify provenance chain for the version',
          severity: MetaGovernanceViolationSeverity.error,
        ));
      }
    }

    return MetaGovernanceReport(violations: violations);
  }
}
