// Phase M verification — Regression: L and M1–M9 test suites must remain green.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Phase M regression', () {
    test('L + M1–M9: contract, idempotency, composition, graph tests pass', () async {
      final result = await Process.run(
        'flutter',
        [
          'test',
          'test/flow/application/contract',
          'test/flow/application/idempotency',
          'test/flow/composition',
          'test/flow/graph',
        ],
        runInShell: true,
        workingDirectory: Directory.current.path,
      );
      expect(
        result.exitCode,
        0,
        reason: result.stderr.toString().isNotEmpty
            ? result.stderr.toString()
            : result.stdout.toString(),
      );
    }, timeout: const Timeout(Duration(minutes: 6)));
  });
}
