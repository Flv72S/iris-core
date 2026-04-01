// K7 — Deterministic HMAC-SHA256 signature adapter. No entropy, no network.

import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/node_identity_provider.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/signature/signature_metadata.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/signature/signature_port.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/signature/signature_verification_result.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/signature/signed_payload.dart';

const String _kConstantSalt = 'iris.signature.v1';

/// Reference implementation of [SignaturePort] using HMAC-SHA256.
/// Key is derived deterministically from nodeId (via [NodeIdentityProvider]) + constant salt.
class DeterministicSignatureAdapter implements SignaturePort {
  DeterministicSignatureAdapter(this._nodeIdentityProvider);

  final NodeIdentityProvider _nodeIdentityProvider;

  List<int> _getKeyBytes() {
    final nodeId = _nodeIdentityProvider.getNodeId();
    final input = nodeId + _kConstantSalt;
    final digest = sha256.convert(utf8.encode(input));
    return digest.bytes;
  }

  @override
  SignedPayload sign({
    required List<int> payload,
    required SignatureMetadata metadata,
  }) {
    final keyBytes = _getKeyBytes();
    final hmac = Hmac(sha256, keyBytes);
    final digest = hmac.convert(payload);
    return SignedPayload(
      signatureBytes: digest.bytes,
      metadata: metadata,
    );
  }

  @override
  SignatureVerificationResult verify({
    required List<int> payload,
    required SignedPayload signature,
  }) {
    final computed = sign(payload: payload, metadata: signature.metadata);
    if (computed.signatureBytes.length != signature.signatureBytes.length) {
      return const SignatureVerificationResult.invalid('Signature length mismatch');
    }
    for (var i = 0; i < computed.signatureBytes.length; i++) {
      if (computed.signatureBytes[i] != signature.signatureBytes[i]) {
        return const SignatureVerificationResult.invalid('Signature mismatch');
      }
    }
    return const SignatureVerificationResult.valid();
  }
}
