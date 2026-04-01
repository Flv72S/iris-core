// ODA-7 — Economic actor identity. Deterministic, replay-safe.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

enum EconomicActorType { node, domain, cluster }

class EconomicIdentity {
  const EconomicIdentity({
    required this.actorId,
    required this.actorType,
    required this.economicPublicKey,
    required this.registrationHash,
    required this.signatureBinding,
  });

  final String actorId;
  final EconomicActorType actorType;
  final String economicPublicKey;
  final String registrationHash;
  final String signatureBinding;

  Map<String, dynamic> get signedPayload => <String, dynamic>{
        'actorId': actorId,
        'actorType': actorType.name,
        'economicPublicKey': economicPublicKey,
      };
}

class EconomicIdentityFactory {
  EconomicIdentityFactory._();

  static EconomicIdentity createEconomicIdentity({
    required String actorId,
    required EconomicActorType actorType,
    required String economicPublicKey,
    required String signatureBinding,
  }) {
    final payload = <String, dynamic>{
      'actorId': actorId,
      'actorType': actorType.name,
      'economicPublicKey': economicPublicKey,
    };
    final registrationHash = CanonicalPayload.hash(payload);
    return EconomicIdentity(
      actorId: actorId,
      actorType: actorType,
      economicPublicKey: economicPublicKey,
      registrationHash: registrationHash,
      signatureBinding: signatureBinding,
    );
  }

  static bool verifyEconomicIdentity(
    EconomicIdentity identity,
    bool Function(String actorId, Map<String, dynamic> payload, String signature) verifySignature,
  ) {
    final expected = CanonicalPayload.hash(identity.signedPayload);
    if (identity.registrationHash != expected) return false;
    return verifySignature(identity.actorId, identity.signedPayload, identity.signatureBinding);
  }

  static String getEconomicIdentityHash(EconomicIdentity identity) {
    return CanonicalPayload.hash(<String, dynamic>{
      'actorId': identity.actorId,
      'registrationHash': identity.registrationHash,
    });
  }
}
