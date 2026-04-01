// Phase 14.8 — External audit reproducibility proof tests.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/certification/evidence/certification_evidence_index.dart';
import 'package:iris_flutter_app/certification/public/public_certification_manifest.dart';
import 'package:iris_flutter_app/certification/reproducibility/external_audit_proof.dart';
import 'package:iris_flutter_app/certification/reproducibility/external_audit_proof_generator.dart';
import 'package:iris_flutter_app/certification/reproducibility/external_audit_proof_serializer.dart';
import 'package:iris_flutter_app/certification/reproducibility/external_audit_proof_verifier.dart';
import 'package:iris_flutter_app/certification/transparency/public_trust_disclosure.dart';

const _forbiddenRuntimeTokens = [
  'DateTime',
  'Random',
  'UUID',
  'dart:io',
  'Platform.',
  'Socket',
  'HttpClient',
];

void main() {
  late PublicCertificationManifest manifest;
  late FreezeSeal seal;
  late BuildFingerprint fingerprint;
  late AuditorEnvironmentSnapshot environment;

  setUpAll(() {
    manifest = publicCertificationManifest;
    final index = certificationEvidenceIndex;
    seal = FreezeSeal(
      hash: index.entries
          .firstWhere((e) => e.id == 'cryptographic_freeze_seal')
          .sha256,
    );
    fingerprint = BuildFingerprint(
      value: index.entries
          .firstWhere((e) => e.id == 'reproducible_build_fingerprint')
          .sha256,
    );
    environment = const AuditorEnvironmentSnapshot(
      mode: 'offline',
      components: [],
    );
  });

  group('1. Deterministic generation', () {
    test('two generations produce equal proof objects', () {
      final recomputed =
          StructuralHashResult(value: manifest.coreStructuralHash);
      final a = generateExternalAuditProof(
        manifest: manifest,
        recomputedHash: recomputed,
        seal: seal,
        fingerprint: fingerprint,
        environment: environment,
      );
      final b = generateExternalAuditProof(
        manifest: manifest,
        recomputedHash: recomputed,
        seal: seal,
        fingerprint: fingerprint,
        environment: environment,
      );
      expect(a.irisCoreVersion, equals(b.irisCoreVersion));
      expect(a.structuralHash, equals(b.structuralHash));
      expect(a.freezeSealHash, equals(b.freezeSealHash));
      expect(a.buildFingerprint, equals(b.buildFingerprint));
      expect(a.reproducedAtUtc, equals(b.reproducedAtUtc));
      expect(a.auditorEnvironmentHash, equals(b.auditorEnvironmentHash));
      expect(a.hashesMatch, equals(b.hashesMatch));
    });
  });

  group('2. Canonical serialization stability', () {
    test('two serializations produce identical string', () {
      final proof = generateExternalAuditProof(
        manifest: manifest,
        recomputedHash: StructuralHashResult(value: manifest.coreStructuralHash),
        seal: seal,
        fingerprint: fingerprint,
        environment: environment,
      );
      final s1 = serializeExternalAuditProofCanonical(proof);
      final s2 = serializeExternalAuditProofCanonical(proof);
      expect(s1, equals(s2));
    });
  });

  group('3. Hash mismatch detection', () {
    test('altered structural hash yields fullyValid == false', () {
      final validProof = generateExternalAuditProof(
        manifest: manifest,
        recomputedHash: StructuralHashResult(value: manifest.coreStructuralHash),
        seal: seal,
        fingerprint: fingerprint,
        environment: environment,
      );
      final proofWithWrongStructural = ExternalAuditReproducibilityProof(
        irisCoreVersion: validProof.irisCoreVersion,
        structuralHash: '0' * 64,
        freezeSealHash: validProof.freezeSealHash,
        buildFingerprint: validProof.buildFingerprint,
        reproducedAtUtc: validProof.reproducedAtUtc,
        auditorEnvironmentHash: validProof.auditorEnvironmentHash,
        hashesMatch: validProof.hashesMatch,
      );
      final result = verifyExternalAuditProof(
        proofWithWrongStructural,
        manifest,
        seal,
        fingerprint,
      );
      expect(result.fullyValid, isFalse);
      expect(result.structuralHashMatches, isFalse);
    });
  });

  group('4. Offline reproducibility', () {
    test('proof libs do not use network/filesystem/clock', () {
      final dir = Directory.current.path;
      final libPaths = [
        '$dir/lib/certification/reproducibility/external_audit_proof.dart',
        '$dir/lib/certification/reproducibility/external_audit_proof_generator.dart',
        '$dir/lib/certification/reproducibility/external_audit_proof_serializer.dart',
        '$dir/lib/certification/reproducibility/external_audit_proof_verifier.dart',
      ];
      for (final path in libPaths) {
        final content = File(path).readAsStringSync();
        for (final token in _forbiddenRuntimeTokens) {
          expect(
            content.contains(token),
            isFalse,
            reason: '$path must not contain $token',
          );
        }
      }
    });
  });

  group('5. Manifest consistency', () {
    test('proof verifies when all inputs match manifest and seal and fingerprint',
        () {
      final proof = generateExternalAuditProof(
        manifest: manifest,
        recomputedHash: StructuralHashResult(value: manifest.coreStructuralHash),
        seal: seal,
        fingerprint: fingerprint,
        environment: environment,
      );
      final result = verifyExternalAuditProof(
        proof,
        manifest,
        seal,
        fingerprint,
      );
      expect(result.structuralHashMatches, isTrue);
      expect(result.freezeSealMatches, isTrue);
      expect(result.fingerprintMatches, isTrue);
      expect(result.fullyValid, isTrue);
    });
  });
}
