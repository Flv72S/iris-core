import 'dart:io';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Forbidden Guard - media_execution', () {
    test('lib/media_execution files contain no forbidden patterns', () {
      final libDir = Directory('lib/media_execution');
      if (!libDir.existsSync()) {
        fail('lib/media_execution directory does not exist');
      }

      final forbiddenPatterns = [
        RegExp(r'\bFile\b'),
        RegExp(r'\bDirectory\b'),
        RegExp(r'\bPath\b'),
        RegExp(r'\bDateTime\b'),
        RegExp(r'\bRandom\b'),
        RegExp(r'\bTimer\b'),
        RegExp(r'\bhttp\b', caseSensitive: false),
        RegExp(r'\bdio\b', caseSensitive: false),
        RegExp(r'\baws\b', caseSensitive: false),
        RegExp(r'\bgcs\b', caseSensitive: false),
        RegExp(r'\bazure\b', caseSensitive: false),
        RegExp(r'\bs3\b', caseSensitive: false),
      ];

      final violations = <String>[];

      for (final file in libDir.listSync(recursive: true)) {
        if (file is! File || !file.path.endsWith('.dart')) continue;

        final content = file.readAsStringSync();
        final lines = content.split('\n');

        for (var i = 0; i < lines.length; i++) {
          final line = lines[i];
          if (line.trim().startsWith('//')) continue;

          for (final pattern in forbiddenPatterns) {
            if (pattern.hasMatch(line)) {
              violations.add(
                '${file.path}:${i + 1}: contains ${pattern.pattern}',
              );
            }
          }
        }
      }

      if (violations.isNotEmpty) {
        fail('Forbidden patterns found:\n${violations.join('\n')}');
      }
    });

    test('lib/media_execution files do not import dart:io', () {
      final libDir = Directory('lib/media_execution');
      if (!libDir.existsSync()) {
        fail('lib/media_execution directory does not exist');
      }

      final violations = <String>[];

      for (final file in libDir.listSync(recursive: true)) {
        if (file is! File || !file.path.endsWith('.dart')) continue;

        final content = file.readAsStringSync();
        if (content.contains("import 'dart:io'") ||
            content.contains('import "dart:io"')) {
          violations.add('${file.path}: imports dart:io');
        }
      }

      if (violations.isNotEmpty) {
        fail('Forbidden imports found:\n${violations.join('\n')}');
      }
    });

    test('lib/media_execution has no IO-based implementations', () {
      final libDir = Directory('lib/media_execution');
      if (!libDir.existsSync()) {
        fail('lib/media_execution directory does not exist');
      }

      // Allowed: SimulatedExecutionAdapter (test provider, no IO)
      // Forbidden: any implementation that uses dart:io
      final violations = <String>[];

      for (final file in libDir.listSync(recursive: true)) {
        if (file is! File || !file.path.endsWith('.dart')) continue;

        final content = file.readAsStringSync();

        // Skip simulated adapter (allowed test provider)
        if (file.path.contains('simulated_execution_adapter')) continue;

        // Check for implementations in non-simulated files
        if (RegExp(r'class\s+\w+\s+implements\s+MediaExecutionPort')
                .hasMatch(content) ||
            RegExp(r'class\s+\w+\s+extends\s+MediaExecutionPort')
                .hasMatch(content)) {
          violations.add('${file.path}: contains concrete implementation');
        }
      }

      if (violations.isNotEmpty) {
        fail('Unexpected implementations found:\n${violations.join('\n')}');
      }
    });
  });
}
