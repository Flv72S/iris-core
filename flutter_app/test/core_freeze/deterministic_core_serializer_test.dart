// Phase 13.2 — Deterministic Core Serialization Engine tests.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core_freeze/core_surface_manifest.dart';
import 'package:iris_flutter_app/core_freeze/default_core_surface_manifest.dart';
import 'package:iris_flutter_app/core_freeze/deterministic_core_serializer.dart';

const _goldenPath = 'test/core_freeze/golden/core_surface_manifest.json';
const _serializerPath = 'lib/core_freeze/deterministic_core_serializer.dart';

void main() {
  group('4.1 Determinismo puro', () {
    test('two consecutive calls produce the same string', () {
      final a = serializeCoreCanonically(defaultCoreSurfaceManifest);
      final b = serializeCoreCanonically(defaultCoreSurfaceManifest);
      expect(a, equals(b));
    });
  });

  group('4.2 Stabilità tra istanze', () {
    test('two identical manifests (different instances) produce same serialization', () {
      final manifest2 = CoreSurfaceManifest([
        ...defaultCoreSurfaceManifest.entries,
      ]);
      final s1 = serializeCoreCanonically(defaultCoreSurfaceManifest);
      final s2 = serializeCoreCanonically(manifest2);
      expect(s1, equals(s2));
    });
  });

  group('4.3 Assenza whitespace non canonico', () {
    test('output has no double space, no tab, single trailing newline', () {
      final out = serializeCoreCanonically(defaultCoreSurfaceManifest);
      expect(out.contains('  '), isFalse, reason: 'no double space');
      expect(out.contains('\t'), isFalse, reason: 'no tab');
      expect(out.endsWith('\n'), isTrue, reason: 'ends with newline');
      expect(out.endsWith('\n\n'), isFalse, reason: 'single trailing newline');
    });
  });

  group('4.4 Golden snapshot', () {
    test('canonical output matches golden snapshot', () {
      final file = File(_goldenPath);
      expect(file.existsSync(), isTrue);
      final raw = file.readAsStringSync();
      final normalized = raw.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
      final expected = normalized.replaceAll(RegExp(r'\n+$'), '\n');
      final actual = serializeCoreCanonically(defaultCoreSurfaceManifest);
      expect(actual, equals(expected), reason: 'Canonical JSON changed; freeze compromised.');
    });
  });

  group('4.5 Runtime guard', () {
    test('serializer file does not use DateTime, Random, Uuid, Stopwatch, Timer', () {
      final file = File(_serializerPath);
      final content = file.readAsStringSync();
      expect(content.contains('DateTime'), isFalse);
      expect(content.contains('Random'), isFalse);
      expect(content.contains('Uuid'), isFalse);
      expect(content.contains('Stopwatch'), isFalse);
      expect(content.contains('Timer'), isFalse);
    });

    test('serializer file does not use filesystem IO or environment', () {
      final file = File(_serializerPath);
      final content = file.readAsStringSync();
      expect(content.contains('File('), isFalse);
      expect(content.contains('Directory('), isFalse);
      expect(content.contains('Platform.'), isFalse);
      expect(content.contains('io.'), isFalse);
      expect(content.contains('environment'), isFalse);
    });
  });

  group('Stability helper', () {
    test('isCanonicalSerializationStable returns true for default manifest', () {
      expect(isCanonicalSerializationStable(defaultCoreSurfaceManifest), isTrue);
    });
  });
}
