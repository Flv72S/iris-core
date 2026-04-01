// K6.1 — File-based node identity provider tests.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow/infrastructure/adapter/node_identity/node_identity_provider.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/infrastructure_exception.dart';

void main() {
  late Directory tempDir;

  setUp(() {
    tempDir = Directory.systemTemp.createTempSync('node_identity_test_');
  });

  tearDown(() {
    if (tempDir.existsSync()) {
      try {
        tempDir.deleteSync(recursive: true);
      } catch (_) {}
    }
  });

  group('K6.1 — 1. Deterministic Regeneration', () {
    test('generate, delete file, regenerate → same ID', () {
      final provider1 = FileBasedNodeIdentityProvider(workingDirectory: tempDir);
      final id1 = provider1.getNodeId();

      final file = File('${tempDir.path}${Platform.pathSeparator}.node_identity');
      expect(file.existsSync(), isTrue);
      file.deleteSync();

      final provider2 = FileBasedNodeIdentityProvider(workingDirectory: tempDir);
      final id2 = provider2.getNodeId();

      expect(id2, id1);
      expect(id2.length, 64);
      expect(id2, matches(RegExp(r'^[a-f0-9]+$')));
    });
  });

  group('K6.1 — 2. Persistence', () {
    test('first call generates, second call same value', () {
      final provider = FileBasedNodeIdentityProvider(workingDirectory: tempDir);
      final first = provider.getNodeId();
      final second = provider.getNodeId();
      expect(second, first);
    });

    test('new instance returns same ID', () {
      final provider1 = FileBasedNodeIdentityProvider(workingDirectory: tempDir);
      final id1 = provider1.getNodeId();

      final provider2 = FileBasedNodeIdentityProvider(workingDirectory: tempDir);
      final id2 = provider2.getNodeId();

      expect(id2, id1);
    });

    test('no file present creates file with valid content', () {
      final provider = FileBasedNodeIdentityProvider(workingDirectory: tempDir);
      final nodeId = provider.getNodeId();

      expect(nodeId, isNotEmpty);
      expect(nodeId.length, 64);
      expect(nodeId, matches(RegExp(r'^[a-f0-9]+$')));

      final file = File('${tempDir.path}${Platform.pathSeparator}.node_identity');
      expect(file.existsSync(), isTrue);
      expect(file.readAsStringSync().trim(), nodeId);
    });
  });

  group('K6.1 — 3. Backward Compatibility', () {
    test('existing valid file → return same value, no regeneration', () {
      const existingId =
          'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456';
      final file = File('${tempDir.path}${Platform.pathSeparator}.node_identity');
      file.writeAsStringSync(existingId);

      final provider = FileBasedNodeIdentityProvider(workingDirectory: tempDir);
      final id = provider.getNodeId();

      expect(id, existingId);
      expect(file.readAsStringSync().trim(), existingId);
    });
  });

  group('K6.1 — 4. Corrupted File', () {
    test('invalid content in file → NodeIdentityException', () {
      final file = File('${tempDir.path}${Platform.pathSeparator}.node_identity');
      file.writeAsStringSync('not-valid-hex');

      final provider = FileBasedNodeIdentityProvider(workingDirectory: tempDir);
      expect(
        () => provider.getNodeId(),
        throwsA(isA<NodeIdentityException>()),
      );
    });

    test('empty file → regenerates', () {
      final file = File('${tempDir.path}${Platform.pathSeparator}.node_identity');
      file.writeAsStringSync('');

      final provider = FileBasedNodeIdentityProvider(workingDirectory: tempDir);
      final nodeId = provider.getNodeId();
      expect(nodeId, isNotEmpty);
      expect(nodeId.length, 64);
      expect(nodeId, matches(RegExp(r'^[a-f0-9]+$')));
    });
  });

  group('K6.1 — 5. Isolation', () {
    test('no Platform.pid, Random, UUID, or Core', () {
      final dir = Directory('lib/flow/infrastructure/adapter/node_identity');
      expect(dir.existsSync(), isTrue);
      final forbidden = [
        'package:iris_flutter_app/core',
        'package:iris_flutter_app/flow/infrastructure/adapter/lock',
        'package:iris_flutter_app/flow/infrastructure/adapter/retry',
        'cloud_storage',
        'Uuid',
        'Random()',
        'Random.',
        'Platform.pid',
        '.pid',
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
