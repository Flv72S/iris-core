// Phase 13.9 — Formal core certification snapshot tests.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core_freeze/audit_bundle_verifier.dart';
import 'package:iris_flutter_app/core_freeze/binary_provenance_record.dart';
import 'package:iris_flutter_app/core_freeze/external_audit_bundle.dart';
import 'package:iris_flutter_app/core_freeze/formal_core_snapshot.dart';
import 'package:iris_flutter_app/core_freeze/phase13_closure_guard.dart';
import 'package:iris_flutter_app/core_freeze/reproducible_build_fingerprint.dart';
import 'package:iris_flutter_app/core_freeze/snapshot_hash.dart';
import 'package:iris_flutter_app/core_freeze/snapshot_serializer.dart';
import 'package:iris_flutter_app/core_freeze/snapshot_verifier.dart';

const _snapshotPath = 'lib/core_freeze/formal_core_snapshot.dart';
const _serializerPath = 'lib/core_freeze/snapshot_serializer.dart';
const _hashPath = 'lib/core_freeze/snapshot_hash.dart';
const _verifierPath = 'lib/core_freeze/snapshot_verifier.dart';
const _guardPath = 'lib/core_freeze/phase13_closure_guard.dart';

ExternalAuditBundle createValidBundle() {
  const v = '13.4';
  const structuralHash = '7df6eba3c96039113db3fb609e2524b4ccd14fec5b29937bad66618de1fe1fff';
  const sealHash = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  final fp = computeBuildFingerprint(
    freezeVersion: v,
    structuralHash: structuralHash,
    freezeSealHash: sealHash,
  );
  final provenance = BinaryProvenanceRecord(
    fingerprint: fp,
    artifactName: 'app.so',
    artifactHash: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  );
  return ExternalAuditBundle(
    freezeVersion: v,
    structuralHash: structuralHash,
    freezeSealHash: sealHash,
    auditChainHashes: [sealHash],
    buildFingerprint: fp,
    binaryProvenance: provenance,
    capabilityCodes: ['core-freeze', 'structural-hash'],
  );
}

void main() {
  group('6.1 — Snapshot determinism', () {
    test('two identical snapshots produce same serialization', () {
      final bundle = createValidBundle();
      final s1 = FormalCoreCertificationSnapshot.fromBundle(bundle);
      final s2 = FormalCoreCertificationSnapshot.fromBundle(bundle);
      expect(serializeSnapshotCanonically(s1), equals(serializeSnapshotCanonically(s2)));
    });
  });

  group('6.2 — Final hash stability', () {
    test('same snapshot produces same CORE_CERTIFICATION_HASH_V1', () {
      final bundle = createValidBundle();
      final snapshot = FormalCoreCertificationSnapshot.fromBundle(bundle);
      final h1 = computeFormalCoreSnapshotHash(snapshot);
      final h2 = computeFormalCoreSnapshotHash(snapshot);
      expect(h1, equals(h2));
      expect(h1.length, equals(64));
    });
  });

  group('6.3 — Coherence with audit bundle', () {
    test('mismatch with bundle causes verification to fail', () {
      final bundle = createValidBundle();
      final snapshot = FormalCoreCertificationSnapshot.fromBundle(bundle);
      final badBundle = ExternalAuditBundle(
        freezeVersion: '13.5',
        structuralHash: bundle.structuralHash,
        freezeSealHash: bundle.freezeSealHash,
        auditChainHashes: bundle.auditChainHashes,
        buildFingerprint: bundle.buildFingerprint,
        binaryProvenance: bundle.binaryProvenance,
        capabilityCodes: bundle.capabilityCodes,
      );
      expect(verifyFormalCoreCertificationSnapshot(snapshot, badBundle), isFalse);
    });
  });

  group('6.4 — Tampering detection', () {
    test('altered auditBundleHash causes verification to fail', () {
      final bundle = createValidBundle();
      final snapshot = FormalCoreCertificationSnapshot.fromBundle(bundle);
      final tampered = FormalCoreCertificationSnapshot(
        freezeVersion: snapshot.freezeVersion,
        structuralHash: snapshot.structuralHash,
        freezeSealHash: snapshot.freezeSealHash,
        auditBundleHash: 'x' * 64,
        buildFingerprintHash: snapshot.buildFingerprintHash,
        binaryProvenanceHash: snapshot.binaryProvenanceHash,
      );
      expect(verifyFormalCoreCertificationSnapshot(tampered, bundle), isFalse);
    });
  });

  group('6.5 — Phase closure enforcement', () {
    test('valid snapshot and bundle → assertPhase13Closed does not throw', () {
      final bundle = createValidBundle();
      expect(verifyExternalAuditBundle(bundle), isTrue);
      final snapshot = FormalCoreCertificationSnapshot.fromBundle(bundle);
      expect(() => assertPhase13Closed(snapshot, bundle), returnsNormally);
    });

    test('invalid snapshot → assertPhase13Closed throws', () {
      final bundle = createValidBundle();
      final badSnapshot = FormalCoreCertificationSnapshot(
        freezeVersion: bundle.freezeVersion,
        structuralHash: bundle.structuralHash,
        freezeSealHash: bundle.freezeSealHash,
        auditBundleHash: 'a' * 64,
        buildFingerprintHash: 'b' * 64,
        binaryProvenanceHash: 'c' * 64,
      );
      expect(
        () => assertPhase13Closed(badSnapshot, bundle),
        throwsA(isA<Phase13ClosureError>()),
      );
    });
  });

  group('FormalCoreCertificationSnapshot', () {
    test('verifyFormalCoreCertificationSnapshot returns true for coherent snapshot and bundle', () {
      final bundle = createValidBundle();
      final snapshot = FormalCoreCertificationSnapshot.fromBundle(bundle);
      expect(verifyFormalCoreCertificationSnapshot(snapshot, bundle), isTrue);
    });
  });

  group('6.6 — Forbidden runtime', () {
    test('snapshot, serializer, hash, verifier, guard have no DateTime, Random, IO, env, network, Platform', () {
      for (final path in [_snapshotPath, _serializerPath, _hashPath, _verifierPath, _guardPath]) {
        final source = File(path).readAsStringSync();
        expect(source, isNot(contains('DateTime')), reason: path);
        expect(source, isNot(contains('Random')), reason: path);
        expect(source, isNot(contains('Timer')), reason: path);
        expect(source, isNot(contains('File(')), reason: path);
        expect(source, isNot(contains('Platform.')), reason: path);
        expect(source, isNot(contains('environment')), reason: path);
        expect(source, isNot(contains('HttpClient')), reason: path);
      }
    });
  });
}
