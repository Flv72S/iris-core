// ODA-9 — Formal adversarial threat types. Immutable when activated.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

class ThreatType {
  ThreatType._();
  static const String nodeCompromise = 'NODE_COMPROMISE';
  static const String domainCompromise = 'DOMAIN_COMPROMISE';
  static const String clusterDivergence = 'CLUSTER_DIVERGENCE';
  static const String governanceBreach = 'GOVERNANCE_BREACH';
  static const String economicManipulation = 'ECONOMIC_MANIPULATION';
  static const String invalidFederationEvent = 'INVALID_FEDERATION_EVENT';
  static const String signatureForgeryAttempt = 'SIGNATURE_FORGERY_ATTEMPT';
  static const String invariantViolation = 'INVARIANT_VIOLATION';
}

class ThreatModel {
  const ThreatModel({
    required this.threatId,
    required this.threatType,
    required this.scope,
    required this.detectionConditionRef,
    required this.severity,
    required this.threatHash,
  });

  final String threatId;
  final String threatType;
  final String scope;
  final String detectionConditionRef;
  final String severity;
  final String threatHash;

  Map<String, dynamic> get payload => <String, dynamic>{
        'threatId': threatId,
        'threatType': threatType,
        'scope': scope,
        'detectionConditionRef': detectionConditionRef,
        'severity': severity,
      };
}

class ThreatModelFactory {
  ThreatModelFactory._();

  static ThreatModel defineThreatModel({
    required String threatId,
    required String threatType,
    required String scope,
    required String detectionConditionRef,
    required String severity,
  }) {
    final payload = <String, dynamic>{
      'threatId': threatId,
      'threatType': threatType,
      'scope': scope,
      'detectionConditionRef': detectionConditionRef,
      'severity': severity,
    };
    final threatHash = CanonicalPayload.hash(payload);
    return ThreatModel(
      threatId: threatId,
      threatType: threatType,
      scope: scope,
      detectionConditionRef: detectionConditionRef,
      severity: severity,
      threatHash: threatHash,
    );
  }

  static bool verifyThreatModel(ThreatModel model) {
    final expected = CanonicalPayload.hash(model.payload);
    return model.threatHash == expected;
  }

  static String getThreatHash(ThreatModel model) => model.threatHash;
}
