// ODA-4 — Trust domain identity. Deterministic domain ID; signed and immutable.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

/// Represents a trust domain. Identity immutable after creation.
class TrustDomainIdentity {
  const TrustDomainIdentity({
    required this.domainId,
    required this.domainPublicKey,
    required this.metadata,
    required this.domainSignature,
    required this.creationHash,
  });

  final String domainId;
  final String domainPublicKey;
  final Map<String, dynamic> metadata;
  final String domainSignature;
  final String creationHash;

  Map<String, dynamic> get signedPayload => <String, dynamic>{
        'domainId': domainId,
        'domainPublicKey': domainPublicKey,
        'metadata': metadata,
      };
}

/// Creates and verifies trust domain identity. Domain ID derived deterministically.
class TrustDomainIdentityFactory {
  TrustDomainIdentityFactory._();

  /// Deterministic domain ID from public key and optional seed. Same inputs → same ID.
  static String domainIdFromPublicKey(String domainPublicKey, [String seed = '']) {
    final envelope = <String, dynamic>{
      'type': 'trust_domain',
      'domainPublicKey': domainPublicKey,
      'seed': seed,
    };
    final h = CanonicalPayload.hash(envelope);
    return 'domain_${h.substring(0, 16)}';
  }

  /// Create trust domain. Caller signs payload and sets creationHash.
  static TrustDomainIdentity createTrustDomain({
    required String domainId,
    required String domainPublicKey,
    required Map<String, dynamic> metadata,
    required String domainSignature,
  }) {
    final payload = <String, dynamic>{
      'domainId': domainId,
      'domainPublicKey': domainPublicKey,
      'metadata': metadata,
    };
    final creationHash = CanonicalPayload.hash(payload);
    return TrustDomainIdentity(
      domainId: domainId,
      domainPublicKey: domainPublicKey,
      metadata: Map.unmodifiable(metadata),
      domainSignature: domainSignature,
      creationHash: creationHash,
    );
  }

  /// Verify domain identity: creationHash matches payload; [verifySignature] returns true if signature valid.
  static bool verifyTrustDomain(
    TrustDomainIdentity domain,
    bool Function(String domainId, Map<String, dynamic> payload, String signature) verifySignature,
  ) {
    final expectedHash = CanonicalPayload.hash(domain.signedPayload);
    if (domain.creationHash != expectedHash) return false;
    return verifySignature(domain.domainId, domain.signedPayload, domain.domainSignature);
  }

  /// Stable domain hash across replay. Same identity → same hash.
  static String getDomainHash(TrustDomainIdentity domain) {
    return CanonicalPayload.hash(<String, dynamic>{
      'domainId': domain.domainId,
      'creationHash': domain.creationHash,
    });
  }
}
