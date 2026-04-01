import 'package:iris_flutter_app/meta_governance_ci/meta_governance_violation.dart';

class MetaGovernanceReport {
  MetaGovernanceReport({required List<MetaGovernanceViolation> violations})
      : _v = List.unmodifiable(List.from(violations));
  final List<MetaGovernanceViolation> _v;
  List<MetaGovernanceViolation> get violations => _v;
  List<MetaGovernanceViolation> get errors => _v.where((x) => x.isError).toList();
  List<MetaGovernanceViolation> get warnings =>
      _v.where((x) => !x.isError).toList();
  bool get passed => errors.isEmpty;
  String toText() {
    final b = StringBuffer();
    b.writeln('=== Meta-Governance CI Report ===');
    b.writeln('Passed: $passed');
    b.writeln('Errors: ${errors.length}');
    b.writeln('Warnings: ${warnings.length}');
    for (final x in _v) b.writeln(x.toString());
    b.writeln('================================');
    return b.toString();
  }
}
