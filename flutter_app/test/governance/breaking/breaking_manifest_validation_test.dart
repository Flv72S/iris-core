import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/governance/breaking/breaking_change_descriptor.dart';
import 'package:iris_flutter_app/governance/breaking/breaking_change_manifest.dart';
import 'package:iris_flutter_app/governance/change/change_descriptor.dart';
import 'package:iris_flutter_app/governance/change/change_scope.dart';
import 'package:iris_flutter_app/governance/change/change_type.dart';
import 'package:iris_flutter_app/governance/versioning/version.dart';

void main() {
  test('validateAgainstVersion true when referenceVersion matches', () {
    final manifest = BreakingChangeManifest.load(
      [],
      referenceVersion: Version(major: 2, minor: 0, patch: 0),
    );
    expect(manifest.validateAgainstVersion(Version(major: 2, minor: 0, patch: 0)), true);
  });
  test('validateAgainst true when declaration matches change', () {
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
      affectedComponents: ['stepGraph'],
    );
    expect(manifest.validateAgainst(change), true);
  });

  test('empty manifest validateAgainst returns false', () {
    final manifest = BreakingChangeManifest.load([]);
    final change = ChangeDescriptor(
      type: ChangeType.hardBreak,
      scope: ChangeScope.flow,
      description: 'Break',
      affectedComponents: ['x'],
    );
    expect(manifest.validateAgainst(change), false);
  });
}
