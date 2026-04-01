// Phase 14.9 — Public certification seal tests.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/certification/evidence/certification_evidence_index.dart';
import 'package:iris_flutter_app/certification/public/public_certification_manifest.dart';
import 'package:iris_flutter_app/certification/public/public_verification_package_builder.dart';
import 'package:iris_flutter_app/certification/reproducibility/external_audit_proof.dart';
import 'package:iris_flutter_app/certification/reproducibility/external_audit_proof_generator.dart';
import 'package:iris_flutter_app/certification/seal/public_certification_claims_guard.dart';
import 'package:iris_flutter_app/certification/seal/public_certification_seal.dart';
import 'package:iris_flutter_app/certification/seal/public_certification_seal_generator.dart';
import 'package:iris_flutter_app/certification/seal/public_certification_seal_serializer.dart';
import 'package:iris_flutter_app/certification/transparency/public_trust_disclosure.dart';
import 'package:iris_flutter_app/certification/transparency/public_trust_disclosure_generator.dart';

const _forbiddenRuntimeTokens = [
  'DateTime',
  'Random',
  'UUID',
  'dart:io',
  'Platform.',
  'Socket',
  'HttpClient',
  'environment',
];

void main() {
  late PublicCertificationManifest manifest;
  late FreezeSeal seal;
  late BuildFingerprint fingerprint;
  late PublicTrustDisclosure disclosure;
  late ExternalAuditReproducibilityProof proof;

  setUpAll(() {
    const builder = PublicVerificationPackageBuilder();
    final package = builder.buildPackageFiles();
    package.remove('PACKAGE_SHA256.txt');
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
    disclosure = generatePublicTrustDisclosure(
      manifest: manifest,
      seal: seal,
      fingerprint: fingerprint,
      verificationPackage: package,
    );
    const environment = AuditorEnvironmentSnapshot(
      mode: 'offline',
      components: [],
    );
    proof = generateExternalAuditProof(
      manifest: manifest,
      recomputedHash: StructuralHashResult(value: manifest.coreStructuralHash),
      seal: seal,
      fingerprint: fingerprint,
      environment: environment,
    );
  });

  group('1. Deterministic generation', () {
    test('two generations with same inputs produce equal seal objects', () {
      final a = generatePublicCertificationSeal(
        manifest: manifest,
        seal: seal,
        fingerprint: fingerprint,
        reproducibilityProof: proof,
        disclosure: disclosure,
      );
      final b = generatePublicCertificationSeal(
        manifest: manifest,
        seal: seal,
        fingerprint: fingerprint,
        reproducibilityProof: proof,
        disclosure: disclosure,
      );
      expect(a, equals(b));
      expect(a.hashCode, equals(b.hashCode));
    });
  });

  group('2. Canonical serialization stability', () {
    test('repeated serialization produces identical string', () {
      final sealObj = generatePublicCertificationSeal(
        manifest: manifest,
        seal: seal,
        fingerprint: fingerprint,
        reproducibilityProof: proof,
        disclosure: disclosure,
      );
      final s1 = serializePublicCertificationSealCanonical(sealObj);
      final s2 = serializePublicCertificationSealCanonical(sealObj);
      expect(s1, equals(s2));
    });
  });

  group('3. Evidence completeness', () {
    test('all certification artifacts appear in evidenceFiles', () {
      const builder = PublicVerificationPackageBuilder();
      final package = builder.buildPackageFiles();
      package.remove('PACKAGE_SHA256.txt');
      final disc = generatePublicTrustDisclosure(
        manifest: manifest,
        seal: seal,
        fingerprint: fingerprint,
        verificationPackage: package,
      );
      final sealObj = generatePublicCertificationSeal(
        manifest: manifest,
        seal: seal,
        fingerprint: fingerprint,
        reproducibilityProof: proof,
        disclosure: disc,
      );
      final evidenceSet = sealObj.evidenceFiles.toSet();
      for (final key in package.keys) {
        expect(evidenceSet.contains(key), isTrue, reason: key);
      }
    });
  });

  group('4. Offline guarantee', () {
    test('seal libs do not use DateTime/Random/UUID/IO/network/env', () {
      final dir = Directory.current.path;
      final libPaths = [
        '$dir/lib/certification/seal/public_certification_seal.dart',
        '$dir/lib/certification/seal/public_certification_seal_generator.dart',
        '$dir/lib/certification/seal/public_certification_seal_serializer.dart',
        '$dir/lib/certification/seal/public_certification_claims_guard.dart',
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

  group('5. Forbidden claims guard', () {
    test('seal with forbidden phrase throws ArgumentError', () {
      const h64 = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      final valid = PublicCertificationSeal(
        irisCoreVersion: '14.3',
        structuralHash: h64,
        freezeSealHash: h64,
        buildFingerprint: h64,
        reproducibilityProofHash: h64,
        trustDisclosureHash: h64,
        evidenceFiles: [],
      );
      validatePublicCertificationSealClaims(valid);

      final invalid = PublicCertificationSeal(
        irisCoreVersion: '14.3',
        structuralHash: h64,
        freezeSealHash: h64,
        buildFingerprint: h64,
        reproducibilityProofHash: h64,
        trustDisclosureHash: h64,
        evidenceFiles: ['legally compliant report'],
      );
      expect(
        () => validatePublicCertificationSealClaims(invalid),
        throwsArgumentError,
      );
    });
  });

  group('6. Seal in verification package', () {
    test('package contains public_certification_seal.json', () {
      const builder = PublicVerificationPackageBuilder();
      final files = builder.buildPackageFiles();
      expect(files.containsKey('public_certification_seal.json'), isTrue);
      final content = files['public_certification_seal.json']!;
      expect(content.contains('structural_hash'), isTrue);
      expect(content.contains('reproducibility_proof_hash'), isTrue);
      expect(content.contains('trust_disclosure_hash'), isTrue);
    });
  });
}
