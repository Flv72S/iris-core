// Phase 13.7 — Reproducible build fingerprint tests.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core_freeze/reproducible_build_fingerprint.dart';

const _fingerprintPath = 'lib/core_freeze/reproducible_build_fingerprint.dart';

void main() {
  const v = '13.4';
  const structuralHash = '7df6eba3c96039113db3fb609e2524b4ccd14fec5b29937bad66618de1fe1fff';
  const sealHash = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

  group('6.1 — Fingerprint determinism', () {
    test('same inputs produce same fingerprintHash', () {
      final a = computeBuildFingerprint(
        freezeVersion: v,
        structuralHash: structuralHash,
        freezeSealHash: sealHash,
      );
      final b = computeBuildFingerprint(
        freezeVersion: v,
        structuralHash: structuralHash,
        freezeSealHash: sealHash,
      );
      expect(a.fingerprintHash, equals(b.fingerprintHash));
      expect(a, equals(b));
    });
  });

  group('6.2 — Mutation detection', () {
    test('changing structural hash changes fingerprintHash', () {
      final f1 = computeBuildFingerprint(
        freezeVersion: v,
        structuralHash: structuralHash,
        freezeSealHash: sealHash,
      );
      final f2 = computeBuildFingerprint(
        freezeVersion: v,
        structuralHash: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        freezeSealHash: sealHash,
      );
      expect(f1.fingerprintHash, isNot(equals(f2.fingerprintHash)));
    });

    test('changing seal hash changes fingerprintHash', () {
      final f1 = computeBuildFingerprint(
        freezeVersion: v,
        structuralHash: structuralHash,
        freezeSealHash: sealHash,
      );
      final f2 = computeBuildFingerprint(
        freezeVersion: v,
        structuralHash: structuralHash,
        freezeSealHash: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      );
      expect(f1.fingerprintHash, isNot(equals(f2.fingerprintHash)));
    });

    test('changing freeze version changes fingerprintHash', () {
      final f1 = computeBuildFingerprint(
        freezeVersion: v,
        structuralHash: structuralHash,
        freezeSealHash: sealHash,
      );
      final f2 = computeBuildFingerprint(
        freezeVersion: '13.5',
        structuralHash: structuralHash,
        freezeSealHash: sealHash,
      );
      expect(f1.fingerprintHash, isNot(equals(f2.fingerprintHash)));
    });
  });

  group('6.3 — Canonical config stability', () {
    test('computeCanonicalBuildConfigHash produces same value for same version', () {
      final h1 = computeCanonicalBuildConfigHash(v);
      final h2 = computeCanonicalBuildConfigHash(v);
      expect(h1, equals(h2));
    });
  });

  group('ReproducibleBuildFingerprint DTO', () {
    test('toJson keys are alphabetical', () {
      final fp = computeBuildFingerprint(
        freezeVersion: '1',
        structuralHash: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        freezeSealHash: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      );
      final keys = fp.toJson().keys.toList();
      expect(
        keys,
        equals([
          'build_config_hash',
          'fingerprint_hash',
          'freeze_seal_hash',
          'freeze_version',
          'structural_hash',
        ]),
      );
    });

    test('fromJson round-trip', () {
      final fp = computeBuildFingerprint(
        freezeVersion: v,
        structuralHash: structuralHash,
        freezeSealHash: sealHash,
      );
      final json = Map<Object?, Object?>.from(fp.toJson());
      final restored = ReproducibleBuildFingerprint.fromJson(json);
      expect(restored, equals(fp));
    });
  });

  group('6.6 — Forbidden runtime', () {
    test('reproducible_build_fingerprint.dart has no DateTime, Random, Timer, File, Platform, env, network', () {
      final source = File(_fingerprintPath).readAsStringSync();
      expect(source, isNot(contains('DateTime')));
      expect(source, isNot(contains('Random')));
      expect(source, isNot(contains('Timer')));
      expect(source, isNot(contains('Stopwatch')));
      expect(source, isNot(contains('File(')));
      expect(source, isNot(contains('Platform.')));
      expect(source, isNot(contains('environment')));
      expect(source, isNot(contains('HttpClient')));
    });
  });
}
