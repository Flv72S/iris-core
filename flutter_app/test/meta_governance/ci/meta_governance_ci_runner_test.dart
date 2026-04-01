// H9 - Runner flow: meta_governance change with empty context -> CI FAIL.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/meta_governance_ci/meta_governance_ci_context.dart';
import 'package:iris_flutter_app/meta_governance_ci/meta_governance_diff_analyzer.dart';
import 'package:iris_flutter_app/meta_governance_ci/meta_governance_gate_engine.dart';

void main() {
  test('changed paths include lib/meta_governance/ and empty context -> report.passed false', () {
    final changedPaths = [
      'lib/meta_governance/versioning/governance_version.dart',
    ];
    final diffResult = MetaGovernanceDiffAnalyzer.analyze(changedPaths);
    final context = MetaGovernanceCIContext.empty;
    final report = MetaGovernanceGateEngine.evaluate(
      diffResult: diffResult,
      context: context,
    );
    expect(report.passed, isFalse);
    expect(diffResult.hasMetaGovernanceLibChanges, isTrue);
  });

  test('no meta_governance changes -> report.passed true', () {
    final changedPaths = <String>[];
    final diffResult = MetaGovernanceDiffAnalyzer.analyze(changedPaths);
    final report = MetaGovernanceGateEngine.evaluate(
      diffResult: diffResult,
      context: MetaGovernanceCIContext.empty,
    );
    expect(report.passed, isTrue);
  });

  test('report.toText contains Passed and Errors', () {
    final diffResult = MetaGovernanceDiffAnalyzer.analyze([
      'lib/meta_governance/gcp/gcp_id.dart',
    ]);
    final report = MetaGovernanceGateEngine.evaluate(
      diffResult: diffResult,
      context: MetaGovernanceCIContext.empty,
    );
    final text = report.toText();
    expect(text, contains('Meta-Governance CI Report'));
    expect(text, contains('Passed:'));
    expect(text, contains('Errors:'));
  });
}
