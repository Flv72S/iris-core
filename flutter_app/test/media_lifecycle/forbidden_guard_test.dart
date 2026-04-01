import 'dart:io';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Forbidden Guard - media_lifecycle', () {
    test('lib/media_lifecycle files contain no forbidden patterns', () {
      final libDir = Directory('lib/media_lifecycle');
      if (!libDir.existsSync()) {
        fail('lib/media_lifecycle directory does not exist');
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
        RegExp(r'\bcompliant\b', caseSensitive: false),
        RegExp(r'\bcertified\b', caseSensitive: false),
        RegExp(r'\bapproved\b', caseSensitive: false),
      ];

      final violations = <String>[];

      for (final file in libDir.listSync(recursive: true)) {
        if (file is! File || !file.path.endsWith('.dart')) continue;

        final content = file.readAsStringSync();
        final lines = content.split('\n');

        for (var i = 0; i < lines.length; i++) {
          final line = lines[i];
          // Skip comments
          if (line.trim().startsWith('//')) continue;

          for (final pattern in forbiddenPatterns) {
            if (pattern.hasMatch(line)) {
              violations.add('${file.path}:${i + 1}: contains ${pattern.pattern}');
            }
          }
        }
      }

      if (violations.isNotEmpty) {
        fail('Forbidden patterns found:\n${violations.join('\n')}');
      }
    });

    test('lib/media_lifecycle files do not import dart:io', () {
      final libDir = Directory('lib/media_lifecycle');
      if (!libDir.existsSync()) {
        fail('lib/media_lifecycle directory does not exist');
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

    test('lib/media_lifecycle files do not contain filesystem paths', () {
      final libDir = Directory('lib/media_lifecycle');
      if (!libDir.existsSync()) {
        fail('lib/media_lifecycle directory does not exist');
      }

      final pathPatterns = [
        RegExp(r'/home/'),
        RegExp(r'/Users/'),
        RegExp(r'C:\\'),
        RegExp(r'D:\\'),
        RegExp(r'\.json'),
        RegExp(r'\.yaml'),
        RegExp(r'\.config'),
      ];

      final violations = <String>[];

      for (final file in libDir.listSync(recursive: true)) {
        if (file is! File || !file.path.endsWith('.dart')) continue;

        final content = file.readAsStringSync();
        final lines = content.split('\n');

        for (var i = 0; i < lines.length; i++) {
          final line = lines[i];
          if (line.trim().startsWith('//')) continue;

          for (final pattern in pathPatterns) {
            if (pattern.hasMatch(line)) {
              violations.add('${file.path}:${i + 1}: contains path pattern');
            }
          }
        }
      }

      if (violations.isNotEmpty) {
        fail('Filesystem paths found:\n${violations.join('\n')}');
      }
    });
  });
}
