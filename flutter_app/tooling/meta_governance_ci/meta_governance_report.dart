// H9 - CI report. Deterministic; passed iff no ERROR violations.

import 'meta_governance_violation.dart';

class MetaGovernanceReport {
  MetaGovernanceReport({required List<MetaGovernanceViolation> violations})
      : _violations = List.unmodifiable(List.from(violations));

  final List<MetaGovernanceViolation> _violations;
  List<MetaGovernanceViolation> get violations => _violations;

  List<MetaGovernanceViolation> get errors =>
      _violations.where((v) => v.isError).toList();
  List<MetaGovernanceViolation> get warnings =>
      _violations.where((v) => !v.isError).toList();

  bool get passed => errors.isEmpty;

  String toText() {
    final buf = StringBuffer();
    buf.writeln('=== Meta-Governance CI Report ===');
    buf.writeln('Passed: $passed');
    buf.writeln('Errors: ${errors.length}');
    buf.writeln('Warnings: ${warnings.length}');
    for (final v in _violations) {
      buf.writeln(v.toString());
    }
    buf.writeln('================================');
    return buf.toString();
  }
}
