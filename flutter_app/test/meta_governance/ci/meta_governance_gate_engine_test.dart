// H9 - Gate engine: missing GCP, provenance, drift -> CI FAIL.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/meta_governance_ci/meta_governance_ci_context.dart';
import 'package:iris_flutter_app/meta_governance_ci/meta_governance_diff_analyzer.dart';
import 'package:iris_flutter_app/meta_governance_ci/meta_governance_gate_engine.dart';

void main() {
  test('structural change without GCP -> passed false, GCP_PRESENCE error', () {
    final diff = MetaGovernanceDiffAnalyzer.analyze([
      'lib/meta_governance/versioning/governance_version.dart',
    ]);
    final report = MetaGovernanceGateEngine.evaluate(
      diffResult: diff,
      context: MetaGovernanceCIContext.empty,
    );
    expect(report.passed, isFalse);
    expect(report.errors.any((v) => v.rule == 'GCP_PRESENCE'), isTrue);
  });

  test('snapshot with invalid provenance -> PROVENANCE_INTEGRITY error', () {
    final diff = MetaGovernanceDiffAnalyzer.analyze([
      'lib/meta_governance/snapshot/governance_snapshot.dart',
    ]);
    final ctx = MetaGovernanceCIContext(
      hasValidGcp: true,
      hasImpactReport: true,
      hasValidDecisionAndRatification: true,
      hasActivationSnapshot: true,
      hasGovernanceSnapshot: true,
      hasZeroDrift: true,
      provenanceValid: false,
    );
    final report = MetaGovernanceGateEngine.evaluate(
      diffResult: diff,
      context: ctx,
    );
    expect(report.passed, isFalse);
    expect(report.errors.any((v) => v.rule == 'PROVENANCE_INTEGRITY'), isTrue);
  });

  test('snapshot with drift -> DRIFT_CHECK error', () {
    final diff = MetaGovernanceDiffAnalyzer.analyze([
      'lib/meta_governance/drift/governance_drift_engine.dart',
    ]);
    final ctx = MetaGovernanceCIContext(
      hasValidGcp: true,
      hasImpactReport: true,
      hasValidDecisionAndRatification: true,
      hasActivationSnapshot: true,
      hasGovernanceSnapshot: true,
      hasZeroDrift: false,
      driftCount: 1,
      provenanceValid: true,
    );
    final report = MetaGovernanceGateEngine.evaluate(
      diffResult: diff,
      context: ctx,
    );
    expect(report.passed, isFalse);
    expect(report.errors.any((v) => v.rule == 'DRIFT_CHECK'), isTrue);
  });

  test('no relevant changes -> passed true', () {
    final diff = MetaGovernanceDiffAnalyzer.analyze(['lib/other/foo.dart']);
    final report = MetaGovernanceGateEngine.evaluate(
      diffResult: diff,
      context: MetaGovernanceCIContext.empty,
    );
    expect(report.passed, isTrue);
  });

  test('same inputs -> same report', () {
    final diff = MetaGovernanceDiffAnalyzer.analyze([
      'lib/meta_governance/gcp/gcp_descriptor.dart',
    ]);
    final r1 = MetaGovernanceGateEngine.evaluate(
      diffResult: diff,
      context: MetaGovernanceCIContext.empty,
    );
    final r2 = MetaGovernanceGateEngine.evaluate(
      diffResult: diff,
      context: MetaGovernanceCIContext.empty,
    );
    expect(r1.passed, r2.passed);
    expect(r1.violations.length, r2.violations.length);
  });

  test('charter file modified without ratification -> CHARTER_INTEGRITY error (Gate 7)', () {
    final diff = MetaGovernanceDiffAnalyzer.analyze([
      'docs/meta-governance/META_GOVERNANCE_CHARTER.md',
    ]);
    final report = MetaGovernanceGateEngine.evaluate(
      diffResult: diff,
      context: MetaGovernanceCIContext.empty,
    );
    expect(report.passed, isFalse);
    expect(report.errors.any((v) => v.rule == 'CHARTER_INTEGRITY'), isTrue);
  });

  test('charter change with ratification -> no G7 violation', () {
    final diff = MetaGovernanceDiffAnalyzer.analyze([
      'docs/meta-governance/META_GOVERNANCE_CHARTER.md',
    ]);
    final ctx = MetaGovernanceCIContext(hasCharterChangeRatified: true);
    final report = MetaGovernanceGateEngine.evaluate(
      diffResult: diff,
      context: ctx,
    );
    expect(report.errors.any((v) => v.rule == 'CHARTER_INTEGRITY'), isFalse);
  });
}
