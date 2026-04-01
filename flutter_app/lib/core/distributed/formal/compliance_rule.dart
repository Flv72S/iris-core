// ODA-8 — Compliance rule. Deterministic; immutable when activated.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

class ComplianceRule {
  const ComplianceRule({
    required this.ruleId,
    required this.scope,
    required this.requiredInvariantIds,
    required this.complianceLevel,
    required this.ruleHash,
  });

  final String ruleId;
  final String scope;
  final List<String> requiredInvariantIds;
  final String complianceLevel;
  final String ruleHash;

  Map<String, dynamic> get payload => <String, dynamic>{
        'ruleId': ruleId,
        'scope': scope,
        'requiredInvariantIds': (List<String>.from(requiredInvariantIds)..sort()),
        'complianceLevel': complianceLevel,
      };
}

class ComplianceRuleFactory {
  ComplianceRuleFactory._();

  static ComplianceRule createComplianceRule({
    required String ruleId,
    required String scope,
    required List<String> requiredInvariantIds,
    required String complianceLevel,
  }) {
    final payload = <String, dynamic>{
      'ruleId': ruleId,
      'scope': scope,
      'requiredInvariantIds': (List<String>.from(requiredInvariantIds)..sort()),
      'complianceLevel': complianceLevel,
    };
    final ruleHash = CanonicalPayload.hash(payload);
    return ComplianceRule(
      ruleId: ruleId,
      scope: scope,
      requiredInvariantIds: requiredInvariantIds,
      complianceLevel: complianceLevel,
      ruleHash: ruleHash,
    );
  }

  static bool verifyComplianceRule(ComplianceRule rule) {
    final expected = CanonicalPayload.hash(rule.payload);
    return rule.ruleHash == expected;
  }

  static bool evaluateCompliance(
    ComplianceRule rule,
    Map<String, dynamic> context,
    bool Function(Map<String, dynamic> context) ruleLogic,
  ) {
    return ruleLogic(context);
  }

  static String getComplianceRuleHash(ComplianceRule rule) => rule.ruleHash;
}
