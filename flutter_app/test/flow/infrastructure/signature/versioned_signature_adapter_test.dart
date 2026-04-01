// K8 — Versioned deterministic signature adapter tests.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow/infrastructure/adapter/signature/key_management/file_based_signing_key_provider.dart';
import 'package:iris_flutter_app/flow/infrastructure/adapter/signature/key_management/signing_key_provider.dart';
import 'package:iris_flutter_app/flow/infrastructure/adapter/signature/key_management/versioned_deterministic_signature_adapter.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/node_identity_provider.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/signature/signature_metadata.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/signature/signed_payload.dart';

class _FakeNodeIdentity implements NodeIdentityProvider {
  _FakeNodeIdentity(this.id);
  final String id;
  @override
  String getNodeId() => id;
}

class _SingleKeyProvider implements SigningKeyProvider {
  _SingleKeyProvider(this.key);
  final SigningKey key;
  @override
  SigningKey getActiveKey() => key;
  @override
  SigningKey? getKeyByVersion(int version) =>
      version == key.version ? key : null;
}

void main() {
  late Directory tempDir;

  setUp(() {
    tempDir = Directory.systemTemp.createTempSync('k8_sig_');
  });

  tearDown(() {
    try {
      if (tempDir.existsSync()) tempDir.deleteSync(recursive: true);
    } catch (_) {}
  });

  group('K8 — 1. First Initialization', () {
    test('no file, sign() creates file with v1', () {
      final node = _FakeNodeIdentity('node-1');
      final keyProvider = FileBasedSigningKeyProvider(
        nodeIdentityProvider: node,
        workingDirectory: tempDir,
      );
      final adapter = VersionedDeterministicSignatureAdapter(keyProvider);

      final meta = SignatureMetadata(signerId: 's1', algorithm: 'HMAC-SHA256');
      adapter.sign(payload: [1, 2, 3], metadata: meta);

      final file = File('${tempDir.path}${Platform.pathSeparator}.signing_keys');
      expect(file.existsSync(), isTrue);
      final content = file.readAsStringSync().trim();
      expect(content, startsWith('1:'));
      expect(content.length, greaterThan(2));
    });
  });

  group('K8 — 2. Rotation', () {
    test('rotateKey() then sign() uses new version; verify old signature still valid', () {
      final node = _FakeNodeIdentity('node-rot');
      final keyProvider = FileBasedSigningKeyProvider(
        nodeIdentityProvider: node,
        workingDirectory: tempDir,
      );
      final adapter = VersionedDeterministicSignatureAdapter(keyProvider);

      const meta = SignatureMetadata(signerId: 's1', algorithm: 'HMAC-SHA256');
      final payload = [10, 20, 30];
      final signedV1 = adapter.sign(payload: payload, metadata: meta);
      expect(signedV1.metadata.attributes['keyVersion'], '1');

      keyProvider.rotateKey();
      final signedV2 = adapter.sign(payload: payload, metadata: meta);
      expect(signedV2.metadata.attributes['keyVersion'], '2');
      expect(signedV2.signatureBytes, isNot(signedV1.signatureBytes));

      final verifyV1 = adapter.verify(payload: payload, signature: signedV1);
      expect(verifyV1.valid, isTrue);
      final verifyV2 = adapter.verify(payload: payload, signature: signedV2);
      expect(verifyV2.valid, isTrue);
    });
  });

  group('K8 — 3. Unknown Version', () {
    test('metadata with non-existent version → verify returns invalid("unknown key version")', () {
      final node = _FakeNodeIdentity('node-uv');
      final keyProvider = FileBasedSigningKeyProvider(
        nodeIdentityProvider: node,
        workingDirectory: tempDir,
      );
      final adapter = VersionedDeterministicSignatureAdapter(keyProvider);

      final signed = adapter.sign(
        payload: [1],
        metadata: const SignatureMetadata(signerId: 's', algorithm: 'HMAC-SHA256'),
      );
      final fakeMeta = SignatureMetadata(
        signerId: signed.metadata.signerId,
        algorithm: signed.metadata.algorithm,
        attributes: {'keyVersion': '999'},
      );
      final fakeSigned = SignedPayload(
        signatureBytes: signed.signatureBytes,
        metadata: fakeMeta,
      );

      final result = adapter.verify(payload: [1], signature: fakeSigned);
      expect(result.valid, isFalse);
      expect(result.failureReason, 'unknown key version');
    });
  });

  group('K8 — 4. Determinism', () {
    test('same payload + same version → same signature', () {
      final node = _FakeNodeIdentity('node-det');
      final keyProvider = FileBasedSigningKeyProvider(
        nodeIdentityProvider: node,
        workingDirectory: tempDir,
      );
      final adapter = VersionedDeterministicSignatureAdapter(keyProvider);

      const meta = SignatureMetadata(signerId: 's', algorithm: 'HMAC-SHA256');
      final payload = [5, 6, 7];

      final s1 = adapter.sign(payload: payload, metadata: meta);
      final s2 = adapter.sign(payload: payload, metadata: meta);

      expect(s1.signatureBytes, s2.signatureBytes);
      expect(s1.metadata.attributes['keyVersion'], s2.metadata.attributes['keyVersion']);
    });
  });

  group('K8 — K7 compatibility', () {
    test('verify signature with keyVersion 0 (legacy) uses legacy key', () {
      final node = _FakeNodeIdentity('node-legacy');
      final fileProvider = FileBasedSigningKeyProvider(
        nodeIdentityProvider: node,
        workingDirectory: tempDir,
      );
      final legacyKey = fileProvider.getKeyByVersion(0)!;
      expect(legacyKey.version, 0);

      final fakeProvider = _SingleKeyProvider(legacyKey);
      final signAdapter = VersionedDeterministicSignatureAdapter(fakeProvider);
      const meta = SignatureMetadata(signerId: 's', algorithm: 'HMAC-SHA256');
      final payload = [1, 2, 3];
      final signed = signAdapter.sign(payload: payload, metadata: meta);
      expect(signed.metadata.attributes['keyVersion'], '0');

      final verifyAdapter = VersionedDeterministicSignatureAdapter(fileProvider);
      final result = verifyAdapter.verify(payload: payload, signature: signed);
      expect(result.valid, isTrue);
    });
  });

  group('K8 — 5. Isolation', () {
    test('key_management and adapter have no Random, DateTime.now, network, Core', () {
      final dir = Directory('lib/flow/infrastructure/adapter/signature');
      expect(dir.existsSync(), isTrue);
      final forbidden = [
        'DateTime.now',
        'Random()',
        'Random.',
        'package:iris_flutter_app/core',
        'package:iris_flutter_app/persistence',
        'http://',
        'https://',
        'Socket.',
        'HttpClient',
      ];
      for (final entity in dir.listSync(recursive: true)) {
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
