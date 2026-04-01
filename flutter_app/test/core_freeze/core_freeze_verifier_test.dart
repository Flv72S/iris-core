// Phase 13.5 — Core Freeze Verifier tests.

import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core_freeze/core_freeze_artifact.dart';
import 'package:iris_flutter_app/core_freeze/core_freeze_verifier.dart';
import 'package:iris_flutter_app/core_freeze/core_surface_manifest.dart';
import 'package:iris_flutter_app/core_freeze/default_core_surface_manifest.dart';
import 'package:iris_flutter_app/core_freeze/official_golden_freeze.dart';

const _verifierPath = 'lib/core_freeze/core_freeze_verifier.dart';
const _cliPath = 'bin/verify_core_freeze.dart';
const _ciPath = 'tool/ci_verify_core_freeze.dart';

void main() {
  group('4.1 — Valid freeze', () {
    test('verifier returns true with official golden and default manifest', () {
      final result = verifyCoreFreezeIntegrity(
        manifest: defaultCoreSurfaceManifest,
        expectedFreezeJson: kOfficialGoldenFreezeJson,
      );
      expect(result, isTrue);
    });
  });

  group('4.2 — Modified manifest detection', () {
    test('missing entry → false', () {
      final fewer = CoreSurfaceManifest(
        defaultCoreSurfaceManifest.entries.skip(1).toList(),
      );
      final result = verifyCoreFreezeIntegrity(
        manifest: fewer,
        expectedFreezeJson: kOfficialGoldenFreezeJson,
      );
      expect(result, isFalse);
    });

    test('changed path → false', () {
      final altered = CoreSurfaceManifest([
        const CoreSurfaceEntry(path: 'lib/bridge/altered.dart', type: 'other'),
        ...defaultCoreSurfaceManifest.entries.skip(1),
      ]);
      final result = verifyCoreFreezeIntegrity(
        manifest: altered,
        expectedFreezeJson: kOfficialGoldenFreezeJson,
      );
      expect(result, isFalse);
    });

    test('changed type → false', () {
      final altered = CoreSurfaceManifest([
        CoreSurfaceEntry(
          path: defaultCoreSurfaceManifest.entries.first.path,
          type: 'model',
        ),
        ...defaultCoreSurfaceManifest.entries.skip(1),
      ]);
      final result = verifyCoreFreezeIntegrity(
        manifest: altered,
        expectedFreezeJson: kOfficialGoldenFreezeJson,
      );
      expect(result, isFalse);
    });
  });

  group('4.3 — Byte-level comparison', () {
    test('comparison is exact string equality, not JSON decode', () {
      final artifact = buildCoreFreezeArtifact(defaultCoreSurfaceManifest);
      final wrongOrderJson = '{"structural_hash":"${artifact.structuralHash}","freeze_version":"${artifact.freezeVersion}","canonical_core":${jsonEncode(artifact.canonicalCoreJson)}}\n';
      final result = verifyCoreFreezeIntegrity(
        manifest: defaultCoreSurfaceManifest,
        expectedFreezeJson: wrongOrderJson,
      );
      expect(result, isFalse);
    });
  });

  group('4.4 — Determinism', () {
    test('two consecutive verifications → same result', () {
      final r1 = verifyCoreFreezeIntegrity(
        manifest: defaultCoreSurfaceManifest,
        expectedFreezeJson: kOfficialGoldenFreezeJson,
      );
      final r2 = verifyCoreFreezeIntegrity(
        manifest: defaultCoreSurfaceManifest,
        expectedFreezeJson: kOfficialGoldenFreezeJson,
      );
      expect(r1, equals(r2));
    });
  });

  group('4.5 — Forbidden runtime guard', () {
    test('core_freeze_verifier.dart has no DateTime, Random, IO, Http, Platform, Process, env, logging', () {
      final source = File(_verifierPath).readAsStringSync();
      expect(source, isNot(contains('DateTime')));
      expect(source, isNot(contains('Random')));
      expect(source, isNot(contains('Stopwatch')));
      expect(source, isNot(contains('Timer')));
      expect(source, isNot(contains('File(')));
      expect(source, isNot(contains('Directory(')));
      expect(source, isNot(contains('HttpClient')));
      expect(source, isNot(contains('Socket')));
      expect(source, isNot(contains('Platform')));
      expect(source, isNot(contains('Process.')));
      expect(source, isNot(contains('environment')));
      expect(source, isNot(contains('dart:io')));
      expect(source, isNot(contains('log(')));
    });

    test('verify_core_freeze.dart and ci_verify_core_freeze.dart have no DateTime, Random, File IO, Directory, Http, Platform, Process, env, logging', () {
      for (final path in [_cliPath, _ciPath]) {
        final source = File(path).readAsStringSync();
        expect(source, isNot(contains('DateTime')), reason: path);
        expect(source, isNot(contains('Random')), reason: path);
        expect(source, isNot(contains('Stopwatch')), reason: path);
        expect(source, isNot(contains('Timer')), reason: path);
        expect(source, isNot(contains('File(')), reason: path);
        expect(source, isNot(contains('Directory(')), reason: path);
        expect(source, isNot(contains('HttpClient')), reason: path);
        expect(source, isNot(contains('Socket')), reason: path);
        expect(source, isNot(contains('Platform')), reason: path);
        expect(source, isNot(contains('Process.')), reason: path);
        expect(source, isNot(contains('environment')), reason: path);
        expect(source, isNot(contains('log(')), reason: path);
      }
    });
  });
}
