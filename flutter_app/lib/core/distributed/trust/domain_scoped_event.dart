// ODA-4 — Event with origin domain; cross-domain carries authorization reference.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

/// Event scoped to a trust domain. Every event declares domain; domain ID immutable.
class DomainScopedEvent {
  const DomainScopedEvent({
    required this.eventIndex,
    required this.originDomainId,
    required this.eventHash,
    required this.domainSignature,
    this.crossDomain = false,
    this.authorizationReference,
  });
  final int eventIndex;
  final String originDomainId;
  final String eventHash;
  final String domainSignature;
  final bool crossDomain;
  final String? authorizationReference;

  /// Create domain-scoped event. Caller provides signature over canonical payload.
  static DomainScopedEvent createDomainScopedEvent({
    required int eventIndex,
    required String originDomainId,
    required String eventHash,
    required String domainSignature,
    bool crossDomain = false,
    String? authorizationReference,
  }) {
    return DomainScopedEvent(
      eventIndex: eventIndex,
      originDomainId: originDomainId,
      eventHash: eventHash,
      domainSignature: domainSignature,
      crossDomain: crossDomain,
      authorizationReference: authorizationReference,
    );
  }

  Map<String, dynamic> get signedPayload => <String, dynamic>{
        'eventIndex': eventIndex,
        'originDomainId': originDomainId,
        'eventHash': eventHash,
        'crossDomain': crossDomain,
        if (authorizationReference != null) 'authorizationReference': authorizationReference,
      };

  /// Verify: payload hash consistent; [verifySignature] returns true if domain signature valid.
  static bool verifyDomainScopedEvent(
    DomainScopedEvent event,
    bool Function(String originDomainId, Map<String, dynamic> payload, String signature) verifySignature,
  ) {
    return verifySignature(event.originDomainId, event.signedPayload, event.domainSignature);
  }
}
