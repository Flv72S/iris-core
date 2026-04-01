// K8 — Versioned deterministic signature adapter. Implements SignaturePort.

import 'package:crypto/crypto.dart';
import 'package:iris_flutter_app/flow/infrastructure/adapter/signature/key_management/signing_key_provider.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/signature/signature_metadata.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/signature/signature_port.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/signature/signature_verification_result.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/signature/signed_payload.dart';

/// Implements [SignaturePort] with key versioning. Uses [SigningKeyProvider] for active and versioned keys.
class VersionedDeterministicSignatureAdapter implements SignaturePort {
  VersionedDeterministicSignatureAdapter(this._keyProvider);

  final SigningKeyProvider _keyProvider;

  @override
  SignedPayload sign({
    required List<int> payload,
    required SignatureMetadata metadata,
  }) {
    final key = _keyProvider.getActiveKey();
    final hmac = Hmac(sha256, key.keyBytes);
    final digest = hmac.convert(payload);
    final attrs = Map<String, String>.from(metadata.attributes)
      ..['keyVersion'] = key.version.toString();
    final newMetadata = SignatureMetadata(
      signerId: metadata.signerId,
      algorithm: 'HMAC-SHA256',
      attributes: attrs,
    );
    return SignedPayload(
      signatureBytes: digest.bytes,
      metadata: newMetadata,
    );
  }

  @override
  SignatureVerificationResult verify({
    required List<int> payload,
    required SignedPayload signature,
  }) {
    final versionStr = signature.metadata.attributes['keyVersion'];
    final version = versionStr != null ? int.tryParse(versionStr) : 0;
    if (version == null) {
      return const SignatureVerificationResult.invalid('unknown key version');
    }
    final key = _keyProvider.getKeyByVersion(version);
    if (key == null) {
      return const SignatureVerificationResult.invalid('unknown key version');
    }
    final hmac = Hmac(sha256, key.keyBytes);
    final digest = hmac.convert(payload);
    if (digest.bytes.length != signature.signatureBytes.length) {
      return const SignatureVerificationResult.invalid('Signature length mismatch');
    }
    for (var i = 0; i < digest.bytes.length; i++) {
      if (digest.bytes[i] != signature.signatureBytes[i]) {
        return const SignatureVerificationResult.invalid('Signature mismatch');
      }
    }
    return const SignatureVerificationResult.valid();
  }
}
