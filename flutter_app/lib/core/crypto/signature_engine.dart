// OX7 — Deterministic signing. Same key + payload → same signature. No random nonce.

import 'dart:convert';
import 'dart:typed_data';

import 'package:cryptography/cryptography.dart';

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';
import 'package:iris_flutter_app/core/crypto/key_store.dart';
import 'package:iris_flutter_app/core/crypto/signed_event.dart';
import 'package:iris_flutter_app/core/identity/identity_model.dart';

final Ed25519 _ed25519 = Ed25519();

/// Signs canonical payload with identity key. Deterministic: same key + payload → same signature.
class SignatureEngine {
  SignatureEngine(this._keyStore);

  final KeyStore _keyStore;

  /// Signs [payload] as [identityId]. Payload is canonicalized and hashed (SHA-256); hash is signed with Ed25519.
  /// Returns [SignedEvent] or throws if key not found. Does not mutate [payload].
  Future<SignedEvent> sign({
    required Map<String, dynamic> payload,
    required String identityId,
    required String eventId,
  }) async {
    final keyPair = await _keyStore.getKeyPair(identityId);
    if (keyPair == null) throw StateError('No key for identity: $identityId');
    final publicKeyB64 = await _keyStore.getPublicKeyBase64(identityId);
    if (publicKeyB64 == null) throw StateError('No public key for identity: $identityId');

    final canonicalBytes = CanonicalPayload.serialize(payload);
    final hashHex = CanonicalPayload.hashFromBytes(canonicalBytes);
    final messageToSign = Uint8List.fromList(utf8.encode(hashHex));

    final signature = await _ed25519.sign(
      messageToSign,
      keyPair: keyPair,
    );
    final signatureBase64 = base64Encode(signature.bytes);

    return SignedEvent(
      eventId: eventId,
      payload: Map<String, dynamic>.from(payload),
      identityId: identityId,
      publicKey: publicKeyB64,
      signature: signatureBase64,
    );
  }
}
