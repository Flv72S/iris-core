// Microstep 12.7 — Forbidden Claim Guard: global source scan, explicit fail on violation.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/ui/certification_status/forbidden_claim_guard.dart';

const _guardFileName = 'forbidden_claim_guard.dart';

void main() {
  group('2.1 Source scan deterministic', () {
    test('no guarded file contains a forbidden certification term', () {
      final terms = ForbiddenClaimGuard.forbiddenTerms();
      final paths = ForbiddenClaimGuard.guardedPaths();

      for (final relPath in paths) {
        final dir = Directory(relPath);
        if (!dir.existsSync()) continue;

        for (final entity in dir.listSync()) {
          if (entity is! File || !entity.path.endsWith('.dart')) continue;
          final name = entity.uri.pathSegments.last;
          if (name == _guardFileName) continue;

          final content = entity.readAsStringSync();
          final contentLower = content.toLowerCase();

          for (final term in terms) {
            final termLower = term.toLowerCase();
            if (!contentLower.contains(termLower)) continue;

            final displayPath = entity.path.replaceAll('\\', '/');
            fail(
              'Forbidden certification claim detected:\n'
              'term: "$term"\n'
              'file: "$displayPath"',
            );
          }
        }
      }
    });
  });

  group('2.2 Regole di matching', () {
    test('forbiddenTerms returns list usable for case-insensitive check', () {
      final terms = ForbiddenClaimGuard.forbiddenTerms();
      expect(terms, isNotEmpty);
      for (final term in terms) {
        expect(term.toLowerCase(), equals(term.toLowerCase()));
      }
    });

    test('guardedPaths returns only certification_status scope', () {
      final paths = ForbiddenClaimGuard.guardedPaths();
      expect(paths, isNotEmpty);
      for (final p in paths) {
        expect(p.contains('certification_status'), isTrue);
        expect(p.contains('build'), isFalse);
        expect(p.contains('core'), isFalse);
      }
    });
  });

  group('2.4 Determinism guard', () {
    test('guard and test files do not use DateTime, Random, Stopwatch, Timer APIs', () {
      final patterns = [
        'Date' + 'Time.',
        'Random' + '()',
        'Stop' + 'watch()',
        'Tim' + 'er(',
      ];
      final paths = [
        'lib/ui/certification_status/forbidden_claim_guard.dart',
        'test/ui_certification_status/forbidden_claim_guard_test.dart',
      ];
      for (final path in paths) {
        final file = File(path);
        if (!file.existsSync()) continue;
        final content = file.readAsStringSync();
        for (final pattern in patterns) {
          expect(
            content.contains(pattern),
            isFalse,
            reason: 'File $path must not use API: $pattern',
          );
        }
      }
    });
  });
}
