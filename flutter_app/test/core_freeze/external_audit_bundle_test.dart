// Phase 13.8 — External audit bundle tests.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core_freeze/audit_bundle_hash.dart';
import 'package:iris_flutter_app/core_freeze/audit_bundle_serializer.dart';
import 'package:iris_flutter_app/core_freeze/audit_bundle_verifier.dart';
import 'package:iris_flutter_app/core_freeze/binary_provenance_record.dart';
import 'package:iris_flutter_app/core_freeze/external_audit_bundle.dart';
import 'package:iris_flutter_app/core_freeze/reproducible_build_fingerprint.dart';

const _bundlePath = 'lib/core_freeze/external_audit_bundle.dart';
const _serializerPath = 'lib/core_freeze/audit_bundle_serializer.dart';
const _hashPath = 'lib/core_freeze/audit_bundle_hash.dart';
const _verifierPath = 'lib/core_freeze/audit_bundle_verifier.dart';

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
    artifactHash: 'b' * 64,
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
  group('5.1 — Serialization determinism', () {
    test('two serializations produce identical output', () {
      final bundle = createValidBundle();
      final a = serializeAuditBundleCanonically(bundle);
      final b = serializeAuditBundleCanonically(bundle);
      expect(a, equals(b));
    });
  });

  group('5.2 — Hash stability', () {
    test('same bundle produces same hash', () {
      final bundle = createValidBundle();
      final h1 = computeAuditBundleHash(bundle);
      final h2 = computeAuditBundleHash(bundle);
      expect(h1, equals(h2));
      expect(h1.length, equals(64));
      expect(h1, equals(h1.toLowerCase()));
    });
  });

  group('5.3 — Tampering detection', () {
    test('altered structural hash causes verification to fail', () {
      final bundle = createValidBundle();
      final tampered = ExternalAuditBundle(
        freezeVersion: bundle.freezeVersion,
        structuralHash: 'x' * 64,
        freezeSealHash: bundle.freezeSealHash,
        auditChainHashes: bundle.auditChainHashes,
        buildFingerprint: bundle.buildFingerprint,
        binaryProvenance: bundle.binaryProvenance,
        capabilityCodes: bundle.capabilityCodes,
      );
      expect(verifyExternalAuditBundle(tampered), isFalse);
    });

    test('altered freeze seal hash causes verification to fail', () {
      final bundle = createValidBundle();
      final tampered = ExternalAuditBundle(
        freezeVersion: bundle.freezeVersion,
        structuralHash: bundle.structuralHash,
        freezeSealHash: 'y' * 64,
        auditChainHashes: bundle.auditChainHashes,
        buildFingerprint: bundle.buildFingerprint,
        binaryProvenance: bundle.binaryProvenance,
        capabilityCodes: bundle.capabilityCodes,
      );
      expect(verifyExternalAuditBundle(tampered), isFalse);
    });

    test('altered fingerprint causes verification to fail', () {
      final bundle = createValidBundle();
      final badFp = ReproducibleBuildFingerprint(
        freezeVersion: bundle.buildFingerprint.freezeVersion,
        structuralHash: bundle.buildFingerprint.structuralHash,
        freezeSealHash: bundle.buildFingerprint.freezeSealHash,
        buildConfigHash: bundle.buildFingerprint.buildConfigHash,
        fingerprintHash: 'z' * 64,
      );
      final tampered = ExternalAuditBundle(
        freezeVersion: bundle.freezeVersion,
        structuralHash: bundle.structuralHash,
        freezeSealHash: bundle.freezeSealHash,
        auditChainHashes: bundle.auditChainHashes,
        buildFingerprint: badFp,
        binaryProvenance: bundle.binaryProvenance,
        capabilityCodes: bundle.capabilityCodes,
      );
      expect(verifyExternalAuditBundle(tampered), isFalse);
    });
  });

  group('5.4 — Full offline verification', () {
    test('verifyExternalAuditBundle returns true for coherent bundle', () {
      final bundle = createValidBundle();
      expect(verifyExternalAuditBundle(bundle), isTrue);
    });
  });

  group('ExternalAuditBundle', () {
    test('fromJson round-trip', () {
      final bundle = createValidBundle();
      final map = bundle.toJson();
      final json = Map<Object?, Object?>.from(
        map.map((k, v) => MapEntry<Object?, Object?>(k, v)),
      );
      final restored = ExternalAuditBundle.fromJson(json);
      expect(restored, equals(bundle));
    });
  });

  group('5.5 — Forbidden runtime', () {
    test('bundle, serializer, hash, verifier have no DateTime, Random, IO, Platform, env, network', () {
      for (final path in [_bundlePath, _serializerPath, _hashPath, _verifierPath]) {
        final source = File(path).readAsStringSync();
        expect(source, isNot(contains('DateTime')), reason: path);
        expect(source, isNot(contains('Random')), reason: path);
        expect(source, isNot(contains('Timer')), reason: path);
        expect(source, isNot(contains('Stopwatch')), reason: path);
        expect(source, isNot(contains('File(')), reason: path);
        expect(source, isNot(contains('Platform.')), reason: path);
        expect(source, isNot(contains('environment')), reason: path);
        expect(source, isNot(contains('HttpClient')), reason: path);
      }
    });
  });
}
