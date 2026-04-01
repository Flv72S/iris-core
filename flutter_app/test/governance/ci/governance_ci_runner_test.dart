// G7 - Runner: report format and exit code.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/governance_ci/governance_violation_report.dart';

void main() {
  test('GovernanceViolation blocksCi is true for error severity', () {
    const v = GovernanceViolation(
      id: 'X',
      scope: 'flow',
      rule: 'Gate1',
      severity: GovernanceViolationSeverity.error,
      description: 'Test',
    );
    expect(v.blocksCi, isTrue);
  });

  test('GovernanceViolation blocksCi is false for warning severity', () {
    const v = GovernanceViolation(
      id: 'X',
      scope: 'flow',
      rule: 'Gate1',
      severity: GovernanceViolationSeverity.warning,
      description: 'Test',
    );
    expect(v.blocksCi, isFalse);
  });

  test('GovernanceViolation toString is deterministic and readable', () {
    const v = GovernanceViolation(
      id: 'G1',
      scope: 'flow',
      rule: 'Gate1',
      severity: GovernanceViolationSeverity.error,
      description: 'Breaking without declaration',
      suggestedFix: 'Add BreakingChangeDescriptor',
    );
    final s = v.toString();
    expect(s, contains('G1'));
    expect(s, contains('error'));
    expect(s, contains('Breaking without declaration'));
    expect(s, contains('Add BreakingChangeDescriptor'));
    expect(v.toString(), s);
  });

  test('report output is deterministic: same violations same string', () {
    final violations = [
      GovernanceViolation(
        id: 'A',
        scope: 's',
        rule: 'R',
        severity: GovernanceViolationSeverity.error,
        description: 'D',
      ),
    ];
    final out1 = _formatReport(violations);
    final out2 = _formatReport(violations);
    expect(out1, out2);
  });
}

String _formatReport(List<GovernanceViolation> violations) {
  if (violations.isEmpty) return 'Governance CI: 0 violations.';
  final buf = StringBuffer('Governance CI: ${violations.length} violation(s):\n');
  for (final v in violations) {
    buf.writeln(v.toString());
  }
  return buf.toString();
}
