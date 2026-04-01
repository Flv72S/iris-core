// G4 - Negative: scope/type mismatch; CORE_BREAK targetVersion not major.0.0.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/governance/breaking/breaking_change_descriptor.dart';
import 'package:iris_flutter_app/governance/breaking/breaking_change_guard.dart';
import 'package:iris_flutter_app/governance/breaking/breaking_change_manifest.dart';
import 'package:iris_flutter_app/governance/change/change_descriptor.dart';
import 'package:iris_flutter_app/governance/change/change_scope.dart';
import 'package:iris_flutter_app/governance/change/change_type.dart';
import 'package:iris_flutter_app/governance/versioning/version.dart';

void main() {
  test('Scope mismatch: declaration for flow, change for plugin throws', () {
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
      scope: ChangeScope.plugin,
      description: 'Break',
      affectedComponents: ['plugin'],
    );
    expect(
      () => BreakingChangeGuard.enforceBreakingDeclaration(change: change, manifest: manifest),
      throwsA(isA<BreakingChangeViolation>()),
    );
  });

  test('CORE_BREAK with targetVersion 3.1.0 throws', () {
    final decl = BreakingChangeDescriptor(
      type: ChangeType.coreBreak,
      scope: ChangeScope.core,
      targetVersion: Version(major: 3, minor: 1, patch: 0),
      rationale: 'Core change',
      affectedComponents: ['core'],
    );
    final manifest = BreakingChangeManifest.load([decl]);
    final change = ChangeDescriptor(
      type: ChangeType.coreBreak,
      scope: ChangeScope.core,
      description: 'Core change',
      affectedComponents: ['core'],
    );
    expect(
      () => BreakingChangeGuard.enforceBreakingDeclaration(change: change, manifest: manifest),
      throwsA(isA<BreakingChangeViolation>()),
    );
  });

  test('CORE_BREAK with targetVersion 4.0.0 passes', () {
    final decl = BreakingChangeDescriptor(
      type: ChangeType.coreBreak,
      scope: ChangeScope.core,
      targetVersion: Version(major: 4, minor: 0, patch: 0),
      rationale: 'Core evolution',
      affectedComponents: ['core'],
    );
    final manifest = BreakingChangeManifest.load([decl]);
    final change = ChangeDescriptor(
      type: ChangeType.coreBreak,
      scope: ChangeScope.core,
      description: 'Core evolution',
      affectedComponents: ['core'],
    );
    expect(
      () => BreakingChangeGuard.enforceBreakingDeclaration(change: change, manifest: manifest),
      returnsNormally,
    );
  });

  test('Components do not overlap: no match throws', () {
    final decl = BreakingChangeDescriptor(
      type: ChangeType.hardBreak,
      scope: ChangeScope.flow,
      targetVersion: Version(major: 2, minor: 0, patch: 0),
      rationale: 'Break',
      affectedComponents: ['stepGraph'],
    );
    final manifest = BreakingChangeManifest.load([decl]);
    final change = ChangeDescriptor(
      type: ChangeType.hardBreak,
      scope: ChangeScope.flow,
      description: 'Break',
      affectedComponents: ['telemetry'],
    );
    expect(
      () => BreakingChangeGuard.enforceBreakingDeclaration(change: change, manifest: manifest),
      throwsA(isA<BreakingChangeViolation>()),
    );
  });
}
