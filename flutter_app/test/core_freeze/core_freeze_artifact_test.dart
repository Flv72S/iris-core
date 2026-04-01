// Phase 13.4 — Core Freeze Artifact tests. Golden snapshot; deterministic build; no runtime.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core_freeze/core_freeze_artifact.dart';
import 'package:iris_flutter_app/core_freeze/default_core_surface_manifest.dart';

const _artifactLibPath = 'lib/core_freeze/core_freeze_artifact.dart';

void main() {
  group('5.1 — Deterministic build', () {
    test('two builds from same manifest produce equal artifact (== and hashCode)', () {
      final a = buildCoreFreezeArtifact(defaultCoreSurfaceManifest);
      final b = buildCoreFreezeArtifact(defaultCoreSurfaceManifest);
      expect(a, equals(b));
      expect(a.hashCode, equals(b.hashCode));
    });
  });

  group('5.2 — Canonical serialization stability', () {
    test('serialize twice yields identical string', () {
      final artifact = buildCoreFreezeArtifact(defaultCoreSurfaceManifest);
      final s1 = serializeFreezeArtifactCanonically(artifact);
      final s2 = serializeFreezeArtifactCanonically(artifact);
      expect(s1, equals(s2));
    });
  });

  group('5.3 — Structural hash coherence', () {
    test('isValidFreezeArtifact returns true for artifact from default manifest', () {
      final artifact = buildCoreFreezeArtifact(defaultCoreSurfaceManifest);
      expect(isValidFreezeArtifact(artifact), isTrue);
    });
  });

  group('5.4 — Golden artifact snapshot', () {
    test('serialized artifact matches golden file', () {
      final artifact = buildCoreFreezeArtifact(defaultCoreSurfaceManifest);
      final actual = serializeFreezeArtifactCanonically(artifact);
      final goldenPath = 'test/core_freeze/golden/core_freeze_artifact.json';
      var golden = File(goldenPath).readAsStringSync();
      golden = golden.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
      if (golden.startsWith('\uFEFF')) golden = golden.substring(1);
      final expected = golden.trimRight() + '\n';
      expect(actual, equals(expected));
    });
  });

  group('5.5 — Forbidden runtime guard', () {
    test('core_freeze_artifact.dart contains no DateTime, Random, Stopwatch, Timer, IO, env, network, uuid, platform, logging', () {
      final source = File(_artifactLibPath).readAsStringSync();
      expect(source, isNot(contains('DateTime')));
      expect(source, isNot(contains('Random')));
      expect(source, isNot(contains('Stopwatch')));
      expect(source, isNot(contains('Timer')));
      expect(source, isNot(contains('File(')));
      expect(source, isNot(contains('Directory(')));
      expect(source, isNot(contains('Platform.')));
      expect(source, isNot(contains('io.File')));
      expect(source, isNot(contains('io.Directory')));
      expect(source, isNot(contains('environment')));
      expect(source, isNot(contains('HttpClient')));
      expect(source, isNot(contains('Socket')));
      expect(source, isNot(contains('uuid')));
      expect(source, isNot(contains('Uuid')));
      expect(source, isNot(contains('dart:io')));
      expect(source, isNot(contains('log(')));
      expect(source, isNot(contains('print(')));
    });
  });
}
