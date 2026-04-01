// ODA-10 — External system identity. Deterministic; verifiable.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

class ExternalSystemIdentity {
  const ExternalSystemIdentity({
    required this.externalSystemId,
    this.publicKey,
    required this.adapterVersionRef,
    required this.identityHash,
    this.signatureBinding,
  });

  final String externalSystemId;
  final String? publicKey;
  final String adapterVersionRef;
  final String identityHash;
  final String? signatureBinding;

  Map<String, dynamic> get payload => <String, dynamic>{
        'externalSystemId': externalSystemId,
        if (publicKey != null) 'publicKey': publicKey,
        'adapterVersionRef': adapterVersionRef,
      };
}

class ExternalSystemIdentityFactory {
  ExternalSystemIdentityFactory._();

  static ExternalSystemIdentity registerExternalSystem({
    required String externalSystemId,
    String? publicKey,
    required String adapterVersionRef,
    String? signatureBinding,
  }) {
    final payload = <String, dynamic>{
      'externalSystemId': externalSystemId,
      if (publicKey != null) 'publicKey': publicKey,
      'adapterVersionRef': adapterVersionRef,
    };
    final identityHash = CanonicalPayload.hash(payload);
    return ExternalSystemIdentity(
      externalSystemId: externalSystemId,
      publicKey: publicKey,
      adapterVersionRef: adapterVersionRef,
      identityHash: identityHash,
      signatureBinding: signatureBinding,
    );
  }

  static bool verifyExternalSystem(
    ExternalSystemIdentity identity,
    bool Function(String identityHash, String? signature) verify,
  ) {
    final expected = CanonicalPayload.hash(identity.payload);
    if (identity.identityHash != expected) return false;
    return verify(identity.identityHash, identity.signatureBinding);
  }

  static String getExternalSystemHash(ExternalSystemIdentity identity) => identity.identityHash;
}
