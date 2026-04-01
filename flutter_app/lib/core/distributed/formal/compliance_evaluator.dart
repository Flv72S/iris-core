// ODA-8 — Evaluate compliance state. Deterministic score and violations.

import 'package:iris_flutter_app/core/distributed/formal/compliance_rule.dart';

class ComplianceViolation {
  const ComplianceViolation({
    required this.ruleId,
    required this.message,
  });
  final String ruleId;
  final String message;
}

class ComplianceEvaluationResult {
  const ComplianceEvaluationResult({
    required this.passedRules,
    required this.failedRules,
    required this.violations,
    required this.complianceScore,
  });
  final List<String> passedRules;
  final List<String> failedRules;
  final List<ComplianceViolation> violations;
  final int complianceScore;
}

class ComplianceEvaluator {
  ComplianceEvaluator._();

  static ComplianceEvaluationResult evaluateComplianceState({
    required Map<String, dynamic> systemState,
    required List<ComplianceRule> activeRules,
    required Map<String, bool Function(Map<String, dynamic>)> ruleEvaluators,
  }) {
    final passed = <String>[];
    final failed = <String>[];
    final violations = <ComplianceViolation>[];
    for (final rule in activeRules) {
      final evalFn = ruleEvaluators[rule.ruleId];
      final passedRule = evalFn != null && ComplianceRuleFactory.evaluateCompliance(rule, systemState, evalFn);
      if (passedRule) {
        passed.add(rule.ruleId);
      } else {
        failed.add(rule.ruleId);
        violations.add(ComplianceViolation(ruleId: rule.ruleId, message: 'failed'));
      }
    }
    final total = activeRules.length;
    final score = total > 0 ? (passed.length * 100 ~/ total) : 100;
    return ComplianceEvaluationResult(
      passedRules: passed,
      failedRules: failed,
      violations: violations,
      complianceScore: score,
    );
  }
}
