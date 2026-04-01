// OX7 — Deterministic verification. Recompute hash; verify signature; reject deactivated/revoked.

import 'dart:convert';
import 'dart:typed_data';

import 'package:cryptography/cryptography.dart';

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';
import 'package:iris_flutter_app/core/crypto/signed_event.dart';
import 'package:iris_flutter_app/core/identity/identity_model.dart';
import 'package:iris_flutter_app/core/identity/identity_projection.dart';
import 'package:iris_flutter_app/core/identity/device_binding.dart';

final Ed25519 _ed25519 = Ed25519();

/// Verifies signed events. Deterministic: same inputs → same result. Rejects invalid/deactivated/revoked.
class SignatureVerifier {
  SignatureVerifier({IdentityState? identityState}) : _identityState = identityState;

  final IdentityState? _identityState;

  /// Verifies [signedEvent]. Recomputes canonical hash, verifies Ed25519 signature,
  /// validates identityId matches publicKey, and if [IdentityState] provided rejects deactivated identity.
  /// Optionally rejects revoked device if [deviceId] is provided and binding is revoked.
  Future<bool> verify(SignedEvent signedEvent, {String? deviceId}) async {
    final payloadBytes = CanonicalPayload.serialize(signedEvent.payload);
    final hashHex = CanonicalPayload.hashFromBytes(payloadBytes);
    final message = Uint8List.fromList(utf8.encode(hashHex));

    final signatureBytes = base64.decode(signedEvent.signature);
    if (signatureBytes.length != 64) return false; // Ed25519 signature is 64 bytes

    final publicKeyBytes = base64.decode(signedEvent.publicKey);
    if (publicKeyBytes.length != 32) return false;

    final pk = SimplePublicKey(publicKeyBytes, type: _ed25519.keyPairType);
    final sig = Signature(Uint8List.fromList(signatureBytes), publicKey: pk);

    final valid = await _ed25519.verify(message, signature: sig);
    if (!valid) return false;

    final derivedId = deterministicIdentityId(signedEvent.publicKey);
    if (derivedId != signedEvent.identityId) return false;

    if (_identityState != null) {
      final identity = _identityState!.getIdentity(signedEvent.identityId);
      if (identity == null || !identity.isActive) return false;
      if (deviceId != null) {
        final bindings = _identityState!.getDevices(signedEvent.identityId);
        final forDevice = bindings.where((b) => b.deviceId == deviceId).toList();
        if (forDevice.isNotEmpty && forDevice.first.isRevoked) return false;
      }
    }

    return true;
  }
}
