// Microstep 12.9 — Phase 12 Closure Report: formal freeze tests.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

const _reportPath = 'docs/phase-12/PHASE_12_CLOSURE_REPORT.md';

const _requiredSections = [
  '1. Phase Scope',
  '2. Implemented Architecture Layers',
  '3. Technical Guarantees Established',
  '4. Legal-Safety Boundary',
  '5. Audit Readiness Status',
  '6. Explicit Non-Goals of Phase 12',
  '7. Transition to Phase 13–14',
  '8. Determinism & Integrity Statement',
];

const _requiredMicrosteps = [
  '12.1',
  '12.2',
  '12.3',
  '12.4',
  '12.5',
  '12.6',
  '12.7',
  '12.8',
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
  group('3.1 File existence', () {
    test('PHASE_12_CLOSURE_REPORT.md exists', () {
      final file = File(_reportPath);
      expect(file.existsSync(), isTrue);
    });
  });

  group('3.2 Section completeness', () {
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

  group('3.3 Forbidden terms guard', () {
    test('document body contains no forbidden normative terms', () {
      final file = File(_reportPath);
      final lines = file.readAsStringSync().split('\n');
      final bodyLines = lines.length > 1 ? lines.sublist(1) : <String>[];
      final body = bodyLines.join('\n');
      var bodyLower = body.toLowerCase();
      for (final term in _forbiddenTerms) {
        var contentToCheck = bodyLower;
        if (term == 'certified') {
          contentToCheck = bodyLower.replaceAll('certification', '');
        }
        expect(
          contentToCheck.contains(term.toLowerCase()),
          isFalse,
          reason: 'Forbidden term found in body: "$term"',
        );
      }
    });
  });

  group('3.4 Phase reference coherence', () {
    test('all microsteps 12.1 through 12.8 are referenced in the report', () {
      final file = File(_reportPath);
      final content = file.readAsStringSync();
      for (final ms in _requiredMicrosteps) {
        expect(
          content.contains(ms),
          isTrue,
          reason: 'Missing microstep reference: $ms',
        );
      }
    });
  });

  group('3.5 Determinism guard', () {
    test('report does not reference DateTime, clock, or runtime generation', () {
      const p1 = 'date' + 'time';
      const p2 = 'cl' + 'ock';
      const p3 = 'runtime ' + 'generation';
      final file = File(_reportPath);
      final content = file.readAsStringSync().toLowerCase();
      expect(content.contains(p1), isFalse);
      expect(content.contains(p2), isFalse);
      expect(content.contains(p3), isFalse);
    });
  });
}
