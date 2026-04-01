// K7 — Deterministic signature adapter tests.

import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow/infrastructure/adapter/signature/deterministic_signature_adapter.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/node_identity_provider.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/signature/signature_metadata.dart';

/// Fake provider that returns a fixed nodeId for tests.
class _FakeNodeIdentityProvider implements NodeIdentityProvider {
  _FakeNodeIdentityProvider(this.nodeId);
  final String nodeId;
  @override
  String getNodeId() => nodeId;
}

void main() {
  const metadata = SignatureMetadata(
    signerId: 'test-signer',
    algorithm: 'HMAC-SHA256',
  );

  group('K7 — 1. Deterministic signature', () {
    test('same payload + same nodeId → same signature', () {
      final provider = _FakeNodeIdentityProvider('node-a');
      final adapter = DeterministicSignatureAdapter(provider);
      final payload = [1, 2, 3, 4, 5];

      final s1 = adapter.sign(payload: payload, metadata: metadata);
      final s2 = adapter.sign(payload: payload, metadata: metadata);

      expect(s1.signatureBytes, s2.signatureBytes);
      expect(s1.signatureBytes.length, 32);
    });
  });

  group('K7 — 2. Verification success', () {
    test('signed payload → verify → valid = true', () {
      final provider = _FakeNodeIdentityProvider('node-verify');
      final adapter = DeterministicSignatureAdapter(provider);
      final payload = utf8.encode('hello world');

      final signed = adapter.sign(payload: payload, metadata: metadata);
      final result = adapter.verify(payload: payload, signature: signed);

      expect(result.valid, isTrue);
      expect(result.failureReason, isNull);
    });
  });

  group('K7 — 3. Tampered payload', () {
    test('payload modified → verify → valid = false', () {
      final provider = _FakeNodeIdentityProvider('node-tamper');
      final adapter = DeterministicSignatureAdapter(provider);
      final payload = [10, 20, 30];
      final signed = adapter.sign(payload: payload, metadata: metadata);

      final tampered = [10, 20, 31];
      final result = adapter.verify(payload: tampered, signature: signed);

      expect(result.valid, isFalse);
      expect(result.failureReason, isNotNull);
    });
  });

  group('K7 — 4. Different node identity', () {
    test('same payload, different nodeId → different signature', () {
      final adapterA = DeterministicSignatureAdapter(_FakeNodeIdentityProvider('node-A'));
      final adapterB = DeterministicSignatureAdapter(_FakeNodeIdentityProvider('node-B'));
      final payload = [7, 8, 9];

      final signedA = adapterA.sign(payload: payload, metadata: metadata);
      final signedB = adapterB.sign(payload: payload, metadata: metadata);

      expect(signedA.signatureBytes, isNot(signedB.signatureBytes));
    });
  });

  group('K7 — 5. No entropy guard', () {
    test('signature module has no DateTime.now, Random, UUID', () {
      final dir = Directory('lib/flow/infrastructure/adapter/signature');
      expect(dir.existsSync(), isTrue);
      final forbidden = ['DateTime.now', 'Random()', 'Random.', 'Uuid', 'UUID'];
      for (final entity in dir.listSync()) {
        if (entity is! File || !entity.path.endsWith('.dart')) continue;
        final content = entity.readAsStringSync();
        for (final pattern in forbidden) {
          expect(
            content.contains(pattern),
            isFalse,
            reason: '${entity.path} must not reference $pattern',
          );
        }
      }
    });
  });

  group('K7 — 6. Isolation', () {
    test('signature adapter has no core, persistence, replay, cloud', () {
      final dir = Directory('lib/flow/infrastructure/adapter/signature');
      expect(dir.existsSync(), isTrue);
      final forbidden = [
        'package:iris_flutter_app/core',
        'package:iris_flutter_app/persistence',
        'replay',
        'cloud_storage',
        'aws_',
        'amazon',
      ];
      for (final entity in dir.listSync()) {
        if (entity is! File || !entity.path.endsWith('.dart')) continue;
        final content = entity.readAsStringSync();
        for (final pattern in forbidden) {
          expect(
            content.contains(pattern),
            isFalse,
            reason: '${entity.path} must not reference $pattern',
          );
        }
      }
    });
  });
}
