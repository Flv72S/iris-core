// Phase 13.7 — Binary provenance record and verifier tests.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core_freeze/binary_provenance_record.dart';
import 'package:iris_flutter_app/core_freeze/reproducible_build_fingerprint.dart';
import 'package:iris_flutter_app/core_freeze/reproducible_build_verifier.dart';

const _recordPath = 'lib/core_freeze/binary_provenance_record.dart';
const _verifierPath = 'lib/core_freeze/reproducible_build_verifier.dart';

void main() {
  final validFingerprint = computeBuildFingerprint(
    freezeVersion: '13.4',
    structuralHash: '7df6eba3c96039113db3fb609e2524b4ccd14fec5b29937bad66618de1fe1fff',
    freezeSealHash: 'a' * 64,
  );

  group('6.4 — Provenance verification success', () {
    test('valid record returns true', () {
      final record = BinaryProvenanceRecord(
        fingerprint: validFingerprint,
        artifactName: 'app.so',
        artifactHash: 'b' * 64,
      );
      expect(verifyBinaryProvenance(record), isTrue);
    });
  });

  group('6.5 — Tampering detection', () {
    test('altered fingerprintHash in record returns false', () {
      final tampered = ReproducibleBuildFingerprint(
        freezeVersion: validFingerprint.freezeVersion,
        structuralHash: validFingerprint.structuralHash,
        freezeSealHash: validFingerprint.freezeSealHash,
        buildConfigHash: validFingerprint.buildConfigHash,
        fingerprintHash: 'x' * 64,
      );
      final record = BinaryProvenanceRecord(
        fingerprint: tampered,
        artifactName: 'app.so',
        artifactHash: 'b' * 64,
      );
      expect(verifyBinaryProvenance(record), isFalse);
    });

    test('altered buildConfigHash in record returns false', () {
      final tampered = ReproducibleBuildFingerprint(
        freezeVersion: validFingerprint.freezeVersion,
        structuralHash: validFingerprint.structuralHash,
        freezeSealHash: validFingerprint.freezeSealHash,
        buildConfigHash: 'y' * 64,
        fingerprintHash: validFingerprint.fingerprintHash,
      );
      final record = BinaryProvenanceRecord(
        fingerprint: tampered,
        artifactName: 'app.so',
        artifactHash: 'b' * 64,
      );
      expect(verifyBinaryProvenance(record), isFalse);
    });
  });

  group('BinaryProvenanceRecord', () {
    test('fromJson round-trip', () {
      final record = BinaryProvenanceRecord(
        fingerprint: validFingerprint,
        artifactName: 'app.so',
        artifactHash: 'c' * 64,
      );
      final json = Map<Object?, Object?>.from(record.toJson());
      final restored = BinaryProvenanceRecord.fromJson(json);
      expect(restored, equals(record));
    });

    test('equality is by fingerprint, name, hash', () {
      final r1 = BinaryProvenanceRecord(
        fingerprint: validFingerprint,
        artifactName: 'a',
        artifactHash: 'b' * 64,
      );
      final r2 = BinaryProvenanceRecord(
        fingerprint: validFingerprint,
        artifactName: 'a',
        artifactHash: 'b' * 64,
      );
      expect(r1, equals(r2));
      expect(r1.hashCode, equals(r2.hashCode));
    });
  });

  group('6.6 — Forbidden runtime (record)', () {
    test('binary_provenance_record.dart has no DateTime, Random, File, Platform, env, network', () {
      final source = File(_recordPath).readAsStringSync();
      expect(source, isNot(contains('DateTime')));
      expect(source, isNot(contains('Random')));
      expect(source, isNot(contains('File(')));
      expect(source, isNot(contains('Platform.')));
      expect(source, isNot(contains('environment')));
      expect(source, isNot(contains('HttpClient')));
    });
  });

  group('6.6 — Forbidden runtime (verifier)', () {
    test('reproducible_build_verifier.dart has no DateTime, Random, File, Platform, env, network', () {
      final source = File(_verifierPath).readAsStringSync();
      expect(source, isNot(contains('DateTime')));
      expect(source, isNot(contains('Random')));
      expect(source, isNot(contains('File(')));
      expect(source, isNot(contains('Platform.')));
      expect(source, isNot(contains('environment')));
      expect(source, isNot(contains('HttpClient')));
    });
  });
}
