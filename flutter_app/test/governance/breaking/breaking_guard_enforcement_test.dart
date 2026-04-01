import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/governance/breaking/breaking_change_descriptor.dart';
import 'package:iris_flutter_app/governance/breaking/breaking_change_guard.dart';
import 'package:iris_flutter_app/governance/breaking/breaking_change_manifest.dart';
import 'package:iris_flutter_app/governance/change/change_descriptor.dart';
import 'package:iris_flutter_app/governance/change/change_scope.dart';
import 'package:iris_flutter_app/governance/change/change_type.dart';
import 'package:iris_flutter_app/governance/versioning/version.dart';

void main() {
  test('HARD_BREAK empty manifest throws', () {
    final manifest = BreakingChangeManifest.load([]);
    final change = ChangeDescriptor(
      type: ChangeType.hardBreak,
      scope: ChangeScope.flow,
      description: 'Break',
      affectedComponents: ['flow'],
    );
    expect(
      () => BreakingChangeGuard.enforceBreakingDeclaration(change: change, manifest: manifest),
      throwsA(isA<BreakingChangeViolation>()),
    );
  });

  test('NON_BREAKING empty manifest passes', () {
    final manifest = BreakingChangeManifest.load([]);
    final change = ChangeDescriptor(
      type: ChangeType.nonBreaking,
      scope: ChangeScope.flow,
      description: 'Fix',
      affectedComponents: ['flow'],
    );
    BreakingChangeGuard.enforceBreakingDeclaration(change: change, manifest: manifest);
  });

  test('Declaration coherent passes', () {
    final decl = BreakingChangeDescriptor(
      type: ChangeType.hardBreak,
      scope: ChangeScope.flow,
      targetVersion: Version(major: 2, minor: 0, patch: 0),
      rationale: 'Break',
      affectedComponents: ['flow'],
    );
    final manifest = BreakingChangeManifest.load([decl]);
    final change = ChangeDescriptor(
      type: ChangeType.hardBreak,
      scope: ChangeScope.flow,
      description: 'Break',
      affectedComponents: ['flow'],
    );
    BreakingChangeGuard.enforceBreakingDeclaration(change: change, manifest: manifest);
  });

  test('Determinism 100 runs', () {
    final decl = BreakingChangeDescriptor(
      type: ChangeType.softBreak,
      scope: ChangeScope.plugin,
      targetVersion: Version(major: 1, minor: 1, patch: 0),
      rationale: 'Deprecate',
      affectedComponents: ['plugin'],
    );
    final manifest = BreakingChangeManifest.load([decl]);
    final change = ChangeDescriptor(
      type: ChangeType.softBreak,
      scope: ChangeScope.plugin,
      description: 'Deprecate',
      affectedComponents: ['plugin'],
    );
    for (var i = 0; i < 100; i++) {
      BreakingChangeGuard.enforceBreakingDeclaration(change: change, manifest: manifest);
    }
  });
}
