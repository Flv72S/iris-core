// Microstep 12.8 — Certification UX Audit Report: static document tests.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/ui/certification_status/certification_capability.dart';

const _reportPath = 'docs/certification/certification_ux_audit_report.md';

const _requiredSections = [
  '1. Scope',
  '2. Architectural Separation',
  '3. Exposed Technical Capabilities',
  '4. Trust Indicator Rendering Model',
  '5. Provenance Transparency',
  '6. Explicit Non-Goals',
  '7. Determinism and Immutability Guarantees',
  '8. Intended Audit Usage',
];

const _forbiddenTerms = [
  'compliant',
  'certified',
  'approved',
  'meets regulation',
  'conformity',
  'legally valid',
  'regulation satisfied',
];

void main() {
  group('2.1 File existence', () {
    test('certification_ux_audit_report.md exists', () {
      final file = File(_reportPath);
      expect(file.existsSync(), isTrue);
    });
  });

  group('2.2 Section completeness', () {
    test('all required sections are present with exact titles', () {
      final file = File(_reportPath);
      final content = file.readAsStringSync();
      for (final section in _requiredSections) {
        expect(
          content.contains(section),
          isTrue,
          reason: 'Missing section: $section',
        );
      }
    });
  });

  group('2.3 Forbidden terms guard', () {
    test('document contains no forbidden normative terms', () {
      final file = File(_reportPath);
      final content = file.readAsStringSync();
      final contentLower = content.toLowerCase();
      for (final term in _forbiddenTerms) {
        expect(
          contentLower.contains(term.toLowerCase()),
          isFalse,
          reason: 'Forbidden term found: "$term"',
        );
      }
    });
  });

  group('2.4 Capability coherence', () {
    test('every CertificationCapability.code appears in the document at least once', () {
      final file = File(_reportPath);
      final content = file.readAsStringSync();
      for (final cap in CertificationCapability.values) {
        expect(
          content.contains(cap.code),
          isTrue,
          reason: 'Missing capability code in document: ${cap.code}',
        );
      }
    });
  });

  group('2.5 Determinism guard', () {
    test('report does not reference time APIs or runtime generation', () {
      const p1 = 'date' + 'time';
      const p2 = 'cl' + 'ock';
      const p3 = 'runtime ' + 'generation';
      final reportFile = File(_reportPath);
      final reportContent = reportFile.readAsStringSync().toLowerCase();
      expect(reportContent.contains(p1), isFalse);
      expect(reportContent.contains(p2), isFalse);
      expect(reportContent.contains(p3), isFalse);
    });
  });
}
