// ODA-8 — Deterministic compliance audit. Replay-identical.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

class ComplianceAuditReport {
  const ComplianceAuditReport({
    required this.activeInvariants,
    required this.activeComplianceRules,
    required this.evaluationResults,
    required this.violations,
    required this.certificationStatus,
    required this.formalHash,
    required this.divergenceFlags,
  });
  final List<String> activeInvariants;
  final List<String> activeComplianceRules;
  final Map<String, bool> evaluationResults;
  final List<String> violations;
  final bool certificationStatus;
  final String formalHash;
  final Map<String, bool> divergenceFlags;
}

class ComplianceAuditReportGenerator {
  ComplianceAuditReportGenerator._();

  static ComplianceAuditReport generateComplianceAudit({
    required List<String> activeInvariants,
    required List<String> activeComplianceRules,
    required Map<String, bool> evaluationResults,
    required List<String> violations,
    required String formalHash,
    Map<String, bool> divergenceFlags = const {},
  }) {
    final status = violations.isEmpty;
    return ComplianceAuditReport(
      activeInvariants: activeInvariants,
      activeComplianceRules: activeComplianceRules,
      evaluationResults: evaluationResults,
      violations: violations,
      certificationStatus: status,
      formalHash: formalHash,
      divergenceFlags: divergenceFlags,
    );
  }
}
