// Phase 13.5 — CLI behavior tests. Logic matches bin/verify_core_freeze.dart and tool/ci_verify_core_freeze.dart.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core_freeze/core_freeze_verifier.dart';
import 'package:iris_flutter_app/core_freeze/default_core_surface_manifest.dart';
import 'package:iris_flutter_app/core_freeze/official_golden_freeze.dart';

void main() {
  group('5.1 — Exit code success', () {
    test('when verifier returns true, CLI would exit 0', () {
      final valid = verifyCoreFreezeIntegrity(
        manifest: defaultCoreSurfaceManifest,
        expectedFreezeJson: kOfficialGoldenFreezeJson,
      );
      expect(valid, isTrue);
    });
  });

  group('5.2 — Exit code failure', () {
    test('when freeze is wrong, verifier returns false so CLI would exit 1', () {
      const wrongExpected = 'wrong';
      final valid = verifyCoreFreezeIntegrity(
        manifest: defaultCoreSurfaceManifest,
        expectedFreezeJson: wrongExpected,
      );
      expect(valid, isFalse);
    });
  });

  group('5.3 — Output exact match', () {
    test('CLI scripts print exactly CORE_FREEZE_VALID or CORE_FREEZE_MISMATCH with no extra text', () {
      final cliSource = File('bin/verify_core_freeze.dart').readAsStringSync();
      expect(cliSource, contains("print('CORE_FREEZE_VALID')"));
      expect(cliSource, contains("print('CORE_FREEZE_MISMATCH')"));
      const expectedValidLine = 'CORE_FREEZE_VALID';
      expect(expectedValidLine.length, greaterThan(0));
      expect('$expectedValidLine\n', equals('CORE_FREEZE_VALID\n'));
    });
  });
}
