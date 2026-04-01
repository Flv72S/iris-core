// G7 - Gate engine: breaking without declaration, version bump, deprecation, plugin.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/governance/breaking/breaking_change_manifest.dart';
import 'package:iris_flutter_app/governance/change/change_descriptor.dart';
import 'package:iris_flutter_app/governance/change/change_scope.dart';
import 'package:iris_flutter_app/governance/change/change_type.dart';
import 'package:iris_flutter_app/governance/compatibility/compatibility_entry.dart';
import 'package:iris_flutter_app/governance/compatibility/compatibility_matrix.dart';
import 'package:iris_flutter_app/governance/compatibility/compatibility_scope.dart';
import 'package:iris_flutter_app/governance/compatibility/version_range.dart';
import 'package:iris_flutter_app/governance/deprecation/deprecation_descriptor.dart';
import 'package:iris_flutter_app/governance/deprecation/deprecation_registry.dart';
import 'package:iris_flutter_app/governance/plugin/plugin_descriptor.dart';
import 'package:iris_flutter_app/governance/plugin/plugin_scope.dart';
import 'package:iris_flutter_app/governance/versioning/version.dart';

import 'package:iris_flutter_app/governance_ci/governance_gate_engine.dart';
import 'package:iris_flutter_app/governance_ci/governance_git_diff_analyzer.dart';
import 'package:iris_flutter_app/governance_ci/governance_policy_loader.dart';
import 'package:iris_flutter_app/governance_ci/governance_violation_report.dart';

GovernancePolicy _minimalPolicy({
  List<DeprecationDescriptor> deprecations = const [],
  List<PluginDescriptor> plugins = const [],
  BreakingChangeManifest? breakingManifest,
}) {
  final v100 = Version(major: 1, minor: 0, patch: 0);
  final v1999 = Version(major: 1, minor: 999, patch: 999);
  final matrix = CompatibilityMatrix([
    CompatibilityEntry(
      scope: CompatibilityScope.coreToFlow,
      source: VersionRange(minVersion: v100, maxVersion: v100),
      target: VersionRange(minVersion: v100, maxVersion: v1999),
    ),
    CompatibilityEntry(
      scope: CompatibilityScope.flowToPlugin,
      source: VersionRange(minVersion: v100, maxVersion: v1999),
      target: VersionRange(minVersion: v100, maxVersion: v1999),
    ),
  ]);
  return GovernancePolicyLoader.load(
    currentCoreVersion: v100,
    currentFlowVersion: v100,
    compatibilityMatrix: matrix,
    deprecationRegistry: DeprecationRegistry(deprecations),
    breakingManifest: breakingManifest ?? BreakingChangeManifest(declarations: []),
    registeredPlugins: plugins,
  );
}

void main() {
  test('Gate 1: breaking change without declaration produces ERROR', () {
    final policy = _minimalPolicy();
    final context = GovernanceRunContext(
      proposedCoreVersion: null,
      proposedFlowVersion: null,
      changeDescriptor: ChangeDescriptor(
        type: ChangeType.hardBreak,
        scope: ChangeScope.flow,
        description: 'Remove API',
        affectedComponents: ['api.foo'],
      ),
      diffResult: GovernanceGitDiffAnalyzer.fromPaths([]),
    );
    final violations = GovernanceGateEngine.run(policy, context);
    expect(violations.any((v) => v.id == 'G1_BREAKING_WITHOUT_DECLARATION'), isTrue);
    expect(violations.firstWhere((v) => v.id == 'G1_BREAKING_WITHOUT_DECLARATION').blocksCi, isTrue);
  });

  test('Gate 2: wrong version bump produces ERROR', () {
    final policy = _minimalPolicy();
    final context = GovernanceRunContext(
      proposedCoreVersion: Version(major: 1, minor: 0, patch: 0),
      proposedFlowVersion: Version(major: 1, minor: 1, patch: 0),
      changeDescriptor: ChangeDescriptor(
        type: ChangeType.hardBreak,
        scope: ChangeScope.flow,
        description: 'Break',
        affectedComponents: ['x'],
      ),
      diffResult: GovernanceGitDiffAnalyzer.fromPaths([]),
    );
    final violations = GovernanceGateEngine.run(policy, context);
    expect(violations.any((v) => v.id == 'G2_VERSION_BUMP_INVALID'), isTrue);
  });

  test('Gate 4: invalid deprecation in registry produces ERROR', () {
    final dep = DeprecationDescriptor(
      identifier: 'bad',
      scope: ChangeScope.flow,
      startVersion: Version(major: 2, minor: 0, patch: 0),
      sunsetVersion: Version(major: 1, minor: 0, patch: 0),
      rationale: 'Bad range',
    );
    final policy = _minimalPolicy(deprecations: [dep]);
    final context = GovernanceRunContext(
      proposedCoreVersion: null,
      proposedFlowVersion: null,
      changeDescriptor: null,
      diffResult: GovernanceGitDiffAnalyzer.fromPaths([]),
    );
    final violations = GovernanceGateEngine.run(policy, context);
    expect(violations.any((v) => v.id == 'G4_DEPRECATION_SUNSET_INVALID'), isTrue);
  });

  test('Gate 5: incompatible plugin produces ERROR', () {
    final plugin = PluginDescriptor(
      pluginId: 'p',
      pluginVersion: Version(major: 1, minor: 0, patch: 0),
      scope: PluginScope.flowExtension,
      compatibleFlowVersions: VersionRange(
        minVersion: Version(major: 2, minor: 0, patch: 0),
        maxVersion: Version(major: 2, minor: 999, patch: 999),
      ),
      compatibleCoreVersions: VersionRange(
        minVersion: Version(major: 1, minor: 0, patch: 0),
        maxVersion: Version(major: 1, minor: 0, patch: 0),
      ),
      description: 'D',
    );
    final policy = _minimalPolicy(plugins: [plugin]);
    final context = GovernanceRunContext(
      proposedCoreVersion: null,
      proposedFlowVersion: null,
      changeDescriptor: null,
      diffResult: GovernanceGitDiffAnalyzer.fromPaths([]),
    );
    final violations = GovernanceGateEngine.run(policy, context);
    expect(violations.any((v) => v.id == 'G5_PLUGIN_INCOMPATIBLE'), isTrue);
  });

  test('determinism: same input yields same violations', () {
    final dep = DeprecationDescriptor(
      identifier: 'bad',
      scope: ChangeScope.flow,
      startVersion: Version(major: 2, minor: 0, patch: 0),
      sunsetVersion: Version(major: 1, minor: 0, patch: 0),
      rationale: 'x',
    );
    final policy = _minimalPolicy(deprecations: [dep]);
    final context = GovernanceRunContext(
      proposedCoreVersion: null,
      proposedFlowVersion: null,
      changeDescriptor: null,
      diffResult: GovernanceGitDiffAnalyzer.fromPaths([]),
    );
    final first = GovernanceGateEngine.run(policy, context);
    final second = GovernanceGateEngine.run(policy, context);
    expect(first.length, second.length);
    for (var i = 0; i < first.length; i++) {
      expect(first[i].id, second[i].id);
      expect(first[i].description, second[i].description);
    }
  });

  test('no violations when policy and context are valid', () {
    final policy = _minimalPolicy();
    final context = GovernanceRunContext(
      proposedCoreVersion: null,
      proposedFlowVersion: null,
      changeDescriptor: null,
      diffResult: GovernanceGitDiffAnalyzer.fromPaths([]),
    );
    final violations = GovernanceGateEngine.run(policy, context);
    expect(violations.isEmpty, isTrue);
  });
}
