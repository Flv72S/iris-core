// Phase 13.1 — Core surface manifest: determinism and golden snapshot tests.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core_freeze/core_surface_manifest.dart';
import 'package:iris_flutter_app/core_freeze/core_surface_manifest_serializer.dart';
import 'package:iris_flutter_app/core_freeze/default_core_surface_manifest.dart';

const _goldenPath = 'test/core_freeze/golden/core_surface_manifest.json';

void main() {
  group('5.1 Non-empty', () {
    test('manifest contains at least one entry', () {
      expect(defaultCoreSurfaceManifest.entries, isNotEmpty);
    });
  });

  group('5.2 Order stability', () {
    test('paths are in alphabetical order', () {
      final paths = defaultCoreSurfaceManifest.entries.map((e) => e.path).toList();
      final sorted = List<String>.from(paths)..sort();
      expect(paths, orderedEquals(sorted));
    });
  });

  group('5.3 Deterministic serialization', () {
    test('two consecutive serializations produce identical string', () {
      final a = serializeCoreSurfaceManifest(defaultCoreSurfaceManifest);
      final b = serializeCoreSurfaceManifest(defaultCoreSurfaceManifest);
      expect(a, equals(b));
    });
  });

  group('5.4 Snapshot JSON', () {
    test('serialized output matches golden string', () {
      final goldenFile = File(_goldenPath);
      expect(goldenFile.existsSync(), isTrue);
      final raw = goldenFile.readAsStringSync();
      final normalized = raw.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
      final golden = normalized.endsWith('\n')
          ? normalized
          : normalized + '\n';
      final goldenSingle = golden.replaceAll(RegExp(r'\n+$'), '\n');
      final actual = serializeCoreSurfaceManifest(defaultCoreSurfaceManifest);
      expect(actual, equals(goldenSingle), reason: 'Core surface manifest changed; freeze broken.');
    });
  });
}
