// Phase 14.7 — Public trust disclosure tests.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/certification/public/public_certification_manifest.dart';
import 'package:iris_flutter_app/certification/public/public_verification_package_builder.dart';
import 'package:iris_flutter_app/certification/transparency/public_claims_guard.dart';
import 'package:iris_flutter_app/certification/transparency/public_trust_disclosure.dart';
import 'package:iris_flutter_app/certification/transparency/public_trust_disclosure_generator.dart';
import 'package:iris_flutter_app/certification/transparency/public_trust_disclosure_serializer.dart';

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
  late Map<String, String> packageWithoutHash;
  late FreezeSeal seal;
  late BuildFingerprint fingerprint;

  setUpAll(() {
    const builder = PublicVerificationPackageBuilder();
    final full = builder.buildPackageFiles();
    packageWithoutHash = Map.from(full)..remove('PACKAGE_SHA256.txt');
    seal = FreezeSeal(hash: packageWithoutHash['freeze_seal.txt']!);
    fingerprint = BuildFingerprint(
      value: packageWithoutHash['reproducible_build_fingerprint.txt']!,
    );
  });

  group('1. Deterministic generation', () {
    test('two generations produce equal objects', () {
      final a = generatePublicTrustDisclosure(
        manifest: publicCertificationManifest,
        seal: seal,
        fingerprint: fingerprint,
        verificationPackage: Map.from(packageWithoutHash),
      );
      final b = generatePublicTrustDisclosure(
        manifest: publicCertificationManifest,
        seal: seal,
        fingerprint: fingerprint,
        verificationPackage: Map.from(packageWithoutHash),
      );
      expect(a, equals(b));
      expect(a.hashCode, equals(b.hashCode));
    });
  });

  group('2. Canonical serialization stability', () {
    test('two serializations produce identical string', () {
      final disclosure = generatePublicTrustDisclosure(
        manifest: publicCertificationManifest,
        seal: seal,
        fingerprint: fingerprint,
        verificationPackage: Map.from(packageWithoutHash),
      );
      final s1 = serializePublicTrustDisclosureCanonical(disclosure);
      final s2 = serializePublicTrustDisclosureCanonical(disclosure);
      expect(s1, equals(s2));
      expect(s1.length, equals(s2.length));
    });
  });

  group('3. Offline guarantee', () {
    test('disclosure libs do not use DateTime/Random/UUID/IO/network', () {
      final dir = Directory.current.path;
      final libPaths = [
        '$dir/lib/certification/transparency/public_trust_disclosure.dart',
        '$dir/lib/certification/transparency/public_trust_disclosure_generator.dart',
        '$dir/lib/certification/transparency/public_trust_disclosure_serializer.dart',
        '$dir/lib/certification/transparency/public_claims_guard.dart',
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

  group('4. Evidence completeness', () {
    test('all verification package files appear in publishedEvidenceFiles', () {
      final disclosure = generatePublicTrustDisclosure(
        manifest: publicCertificationManifest,
        seal: seal,
        fingerprint: fingerprint,
        verificationPackage: Map.from(packageWithoutHash),
      );
      final published = disclosure.publishedEvidenceFiles.toSet();
      for (final key in packageWithoutHash.keys) {
        expect(published.contains(key), isTrue, reason: key);
      }
      expect(disclosure.publishedEvidenceFiles.length,
          equals(packageWithoutHash.length));
    });
  });

  group('5. Forbidden claims guard', () {
    test('disclosure with forbidden phrase throws ArgumentError', () {
      const h64 = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      final valid = PublicTrustDisclosure(
        irisCoreVersion: '14.3',
        structuralHash: h64,
        freezeSealHash: h64,
        buildFingerprint: h64,
        publishedEvidenceFiles: [],
        verificationSteps: [],
        declaredLimitations: ['Does not evaluate conformity'],
      );
      validatePublicDisclosureClaims(valid);

      final invalid = PublicTrustDisclosure(
        irisCoreVersion: '14.3',
        structuralHash: h64,
        freezeSealHash: h64,
        buildFingerprint: h64,
        publishedEvidenceFiles: [],
        verificationSteps: [],
        declaredLimitations: ['Legally valid and compliant'],
      );
      expect(
        () => validatePublicDisclosureClaims(invalid),
        throwsArgumentError,
      );
    });
  });

  group('6. Disclosure in verification package', () {
    test('package contains public_trust_disclosure.json', () {
      const builder = PublicVerificationPackageBuilder();
      final files = builder.buildPackageFiles();
      expect(files.containsKey('public_trust_disclosure.json'), isTrue);
      final content = files['public_trust_disclosure.json']!;
      expect(content.contains('build_fingerprint'), isTrue);
      expect(content.contains('structural_hash'), isTrue);
    });
  });
}
