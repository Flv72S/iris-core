// F-Media — Forbidden guard. Fails if forbidden patterns appear in flow_media sources.

import 'dart:io';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final flowMediaDir = Directory('lib/flow_media');

  final forbiddenPatterns = [
    RegExp(r'\bFile\b'),
    RegExp(r'\bDirectory\b'),
    RegExp(r'\bPath\b'),
    RegExp(r'\bDateTime\b'),
    RegExp(r'\bRandom\b'),
    RegExp(r'\bTimer\b'),
    RegExp(r'\bhttp\b'),
    RegExp(r'\bdio\b'),
    RegExp(r'aws', caseSensitive: false),
    RegExp(r'gcp', caseSensitive: false),
    RegExp(r'azure', caseSensitive: false),
    RegExp(r's3', caseSensitive: false),
    RegExp(r'compliant', caseSensitive: false),
    RegExp(r'certified', caseSensitive: false),
    RegExp(r'approved', caseSensitive: false),
    RegExp(r'\blegal\b', caseSensitive: false),
  ];

  test('no forbidden patterns in lib/flow_media/', () {
    expect(flowMediaDir.existsSync(), true, reason: 'lib/flow_media/ must exist');
    final files = flowMediaDir.listSync().whereType<File>().where((f) => f.path.endsWith('.dart'));
    final violations = <String>[];
    for (final file in files) {
      final content = file.readAsStringSync();
      for (final pattern in forbiddenPatterns) {
        if (pattern.hasMatch(content)) {
          violations.add('${file.path}: contains ${pattern.pattern}');
        }
      }
    }
    expect(violations, isEmpty, reason: violations.join('\n'));
  });
}
