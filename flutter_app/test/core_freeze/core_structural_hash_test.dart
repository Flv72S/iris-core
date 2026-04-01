// Phase 13.3 — Structural Hash SHA-256 tests.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core_freeze/core_surface_manifest.dart';
import 'package:iris_flutter_app/core_freeze/core_structural_hash.dart';
import 'package:iris_flutter_app/core_freeze/default_core_surface_manifest.dart';

const _serializerPath = 'lib/core_freeze/core_structural_hash.dart';

// Golden hash: SHA-256(serializeCoreCanonically(defaultCoreSurfaceManifest)). Immutable.
const expectedStructuralHash = '7df6eba3c96039113db3fb609e2524b4ccd14fec5b29937bad66618de1fe1fff';

void main() {
  group('4.1 Determinismo puro', () {
    test('two consecutive calls produce the same hash', () {
      final a = computeCoreStructuralHash(defaultCoreSurfaceManifest);
      final b = computeCoreStructuralHash(defaultCoreSurfaceManifest);
      expect(a, equals(b));
    });
  });

  group('4.2 Stabilità tra istanze', () {
    test('two identical manifests produce the same hash', () {
      final manifest2 = CoreSurfaceManifest([
        ...defaultCoreSurfaceManifest.entries,
      ]);
      final h1 = computeCoreStructuralHash(defaultCoreSurfaceManifest);
      final h2 = computeCoreStructuralHash(manifest2);
      expect(h1, equals(h2));
    });
  });

  group('4.3 Formato valido', () {
    test('hash has length 64, lowercase hex, isValidStructuralHash true', () {
      final hash = computeCoreStructuralHash(defaultCoreSurfaceManifest);
      expect(hash.length, equals(64));
      expect(hash, equals(hash.toLowerCase()));
      expect(hash.contains(RegExp(r'[^0-9a-f]')), isFalse);
      expect(isValidStructuralHash(hash), isTrue);
    });

    test('isValidStructuralHash rejects invalid strings', () {
      expect(isValidStructuralHash(''), isFalse);
      expect(isValidStructuralHash('a' * 63), isFalse);
      expect(isValidStructuralHash('a' * 65), isFalse);
      expect(isValidStructuralHash('G' + 'a' * 63), isFalse);
      expect(isValidStructuralHash(' a' * 32), isFalse);
    });
  });

  group('4.4 Golden hash immutabile', () {
    test('computeCoreStructuralHash(defaultManifest) equals expectedStructuralHash', () {
      final actual = computeCoreStructuralHash(defaultCoreSurfaceManifest);
      expect(actual, equals(expectedStructuralHash),
          reason: 'Core structural hash changed; Core Freeze compromised.');
    });
  });

  group('4.5 Forbidden runtime guard', () {
    test('hash file does not use DateTime, Random, Stopwatch, Timer, IO, environment, network, uuid, platform', () {
      final file = File(_serializerPath);
      final content = file.readAsStringSync();
      expect(content.contains('DateTime'), isFalse);
      expect(content.contains('Random'), isFalse);
      expect(content.contains('Stopwatch'), isFalse);
      expect(content.contains('Timer'), isFalse);
      expect(content.contains('File('), isFalse);
      expect(content.contains('Directory('), isFalse);
      expect(content.contains('environment'), isFalse);
      expect(content.contains('Platform'), isFalse);
      expect(content.contains('Uuid'), isFalse);
      expect(content.contains('HttpClient'), isFalse);
      expect(content.contains('Socket'), isFalse);
    });
  });

  group('Stability helper', () {
    test('isStructuralHashStable returns true for default manifest', () {
      expect(isStructuralHashStable(defaultCoreSurfaceManifest), isTrue);
    });
  });
}
