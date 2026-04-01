// ODA-7 — Governance-defined economic rules. Immutable when activated.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

class EconomicPolicy {
  const EconomicPolicy({
    required this.policyId,
    required this.rewardFormulaRef,
    required this.penaltyRules,
    required this.stakeRequirements,
    required this.reputationThresholds,
    required this.economicPolicyHash,
  });

  final String policyId;
  final String rewardFormulaRef;
  final Map<String, dynamic> penaltyRules;
  final Map<String, int> stakeRequirements;
  final Map<String, int> reputationThresholds;
  final String economicPolicyHash;

  Map<String, dynamic> get policyPayload => <String, dynamic>{
        'policyId': policyId,
        'rewardFormulaRef': rewardFormulaRef,
        'penaltyRules': penaltyRules,
        'stakeRequirements': stakeRequirements,
        'reputationThresholds': reputationThresholds,
      };
}

class EconomicPolicyFactory {
  EconomicPolicyFactory._();

  static EconomicPolicy createEconomicPolicy({
    required String policyId,
    required String rewardFormulaRef,
    required Map<String, dynamic> penaltyRules,
    required Map<String, int> stakeRequirements,
    required Map<String, int> reputationThresholds,
  }) {
    final payload = <String, dynamic>{
      'policyId': policyId,
      'rewardFormulaRef': rewardFormulaRef,
      'penaltyRules': penaltyRules,
      'stakeRequirements': stakeRequirements,
      'reputationThresholds': reputationThresholds,
    };
    final hash = CanonicalPayload.hash(payload);
    return EconomicPolicy(
      policyId: policyId,
      rewardFormulaRef: rewardFormulaRef,
      penaltyRules: penaltyRules,
      stakeRequirements: stakeRequirements,
      reputationThresholds: reputationThresholds,
      economicPolicyHash: hash,
    );
  }

  static bool verifyEconomicPolicy(EconomicPolicy policy) {
    final expected = CanonicalPayload.hash(policy.policyPayload);
    return policy.economicPolicyHash == expected;
  }

  static String getEconomicPolicyHash(EconomicPolicy policy) => policy.economicPolicyHash;
}
