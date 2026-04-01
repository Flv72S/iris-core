import 'dart:convert';
import 'dart:typed_data';

import 'package:cryptography/cryptography.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/network/identity/deterministic_node_identity.dart';
import 'package:iris_flutter_app/core/network/identity/node_identity_serializer.dart';
import 'package:iris_flutter_app/core/network/identity/node_identity_signature.dart';
import 'package:iris_flutter_app/core/network/identity/node_identity_store.dart';
import 'package:iris_flutter_app/core/network/identity/secure_identity_storage.dart';

/// In-memory storage for tests. Not for production.
class MemorySecureIdentityStorage implements SecureIdentityStorage {
  final Map<String, List<int>> _store = {};

  @override
  Future<void> write(String key, List<int> bytes) async {
    _store[key] = List.from(bytes);
  }

  @override
  Future<List<int>?> read(String key) async {
    final b = _store[key];
    return b == null ? null : List.from(b);
  }

  @override
  Future<void> delete(String key) async {
    _store.remove(key);
  }
}

void main() {
  group('NodeIdentitySerializer', () {
    test('Serialization stability: same identity produces identical canonical bytes', () {
      const identity = DeterministicNodeIdentity(
        nodeId: 'a1b2c3d4-e5f6-4789-abcd-ef0123456789',
        publicKey: 'dGVzdFB1YmxpY0tleQ==',
        protocolVersion: '1.0',
        createdAt: '2026-01-01T00:00:00.000Z',
      );
      final a = NodeIdentitySerializer.toCanonicalBytes(identity);
      final b = NodeIdentitySerializer.toCanonicalBytes(identity);
      expect(a, b);
    });

    test('Round-trip: fromCanonicalBytes(toCanonicalBytes(identity)) equals identity', () {
      const identity = DeterministicNodeIdentity(
        nodeId: 'f6e5d4c3-b2a1-9876-5432-10fedcba0987',
        publicKey: 'cHVibGljMzI=',
        protocolVersion: '1.0',
        createdAt: '2026-06-15T12:00:00.000Z',
      );
      final bytes = NodeIdentitySerializer.toCanonicalBytes(identity);
      final restored = NodeIdentitySerializer.fromCanonicalBytes(bytes);
      expect(restored.nodeId, identity.nodeId);
      expect(restored.publicKey, identity.publicKey);
      expect(restored.protocolVersion, identity.protocolVersion);
      expect(restored.createdAt, identity.createdAt);
    });
  });

  group('NodeIdentitySignature', () {
    test('Signature determinism: same key + message produces same signature', () async {
      final algorithm = Ed25519();
      final keyPair = await algorithm.newKeyPair();
      final message = Uint8List.fromList([1, 2, 3, 4, 5]);
      final sig1 = await sign(message, keyPair);
      final sig2 = await sign(message, keyPair);
      expect(sig1.bytes, sig2.bytes);
    });

    test('Signature verification correctness: valid signature verifies', () async {
      final algorithm = Ed25519();
      final keyPair = await algorithm.newKeyPair();
      final publicKey = await keyPair.extractPublicKey();
      final publicKeyB64 = base64Encode(publicKey.bytes);
      final message = Uint8List.fromList([10, 20, 30]);
      final signature = await sign(message, keyPair);
      final valid = await verify(message, signature, publicKeyB64);
      expect(valid, isTrue);
    });

    test('Signature verification: wrong message fails', () async {
      final algorithm = Ed25519();
      final keyPair = await algorithm.newKeyPair();
      final publicKey = await keyPair.extractPublicKey();
      final publicKeyB64 = base64Encode(publicKey.bytes);
      final message = Uint8List.fromList([1, 2, 3]);
      final signature = await sign(message, keyPair);
      final wrongMessage = Uint8List.fromList([1, 2, 4]);
      final valid = await verify(wrongMessage, signature, publicKeyB64);
      expect(valid, isFalse);
    });
  });

  group('NodeIdentityStore', () {
    test('Identity generation: new store produces persistent identity', () async {
      final storage = MemorySecureIdentityStorage();
      final store = NodeIdentityStore(storage);
      final identity = await store.getNodeIdentity();
      expect(identity.nodeId, isNotEmpty);
      expect(identity.publicKey, isNotEmpty);
      expect(identity.protocolVersion, isNotEmpty);
      expect(identity.createdAt, isNotEmpty);
    });

    test('Persistence across restarts: same storage returns same identity', () async {
      final storage = MemorySecureIdentityStorage();
      final store1 = NodeIdentityStore(storage);
      final identity1 = await store1.getNodeIdentity();
      final store2 = NodeIdentityStore(storage);
      final identity2 = await store2.getNodeIdentity();
      expect(identity2.nodeId, identity1.nodeId);
      expect(identity2.publicKey, identity1.publicKey);
      expect(identity2.protocolVersion, identity1.protocolVersion);
    });

    test('Sign and verify: store can sign, verify with identity publicKey', () async {
      final storage = MemorySecureIdentityStorage();
      final store = NodeIdentityStore(storage);
      final identity = await store.getNodeIdentity();
      final message = Uint8List.fromList([7, 8, 9]);
      final signature = await store.sign(message);
      final valid = await verify(message, signature, identity.publicKey);
      expect(valid, isTrue);
    });
  });
}
