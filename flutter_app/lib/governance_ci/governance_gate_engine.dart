// G7 - Gate engine. Runs all gates; returns violations.

import 'package:iris_flutter_app/governance/breaking/breaking_change_guard.dart';
import 'package:iris_flutter_app/governance/breaking/breaking_change_manifest.dart';
import 'package:iris_flutter_app/governance/change/change_descriptor.dart';
import 'package:iris_flutter_app/governance/change/change_scope.dart';
import 'package:iris_flutter_app/governance/change/change_type.dart';
import 'package:iris_flutter_app/governance/deprecation/deprecation_validator.dart';
import 'package:iris_flutter_app/governance/plugin/plugin_validator.dart';
import 'package:iris_flutter_app/governance/versioning/version.dart';
import 'package:iris_flutter_app/governance/versioning/version_comparator.dart';
import 'package:iris_flutter_app/governance_ci/governance_git_diff_analyzer.dart';
import 'package:iris_flutter_app/governance_ci/governance_policy_loader.dart';
import 'package:iris_flutter_app/governance_ci/governance_violation_report.dart';

/// Context for a CI run: proposed versions and declared change.
class GovernanceRunContext {
  const GovernanceRunContext({
    this.proposedCoreVersion,
    this.proposedFlowVersion,
    this.changeDescriptor,
    required this.diffResult,
  });

  final Version? proposedCoreVersion;
  final Version? proposedFlowVersion;
  final ChangeDescriptor? changeDescriptor;
  final GovernanceDiffResult diffResult;
}

/// Runs all governance gates; returns list of violations. Deterministic.
class GovernanceGateEngine {
  GovernanceGateEngine._();

  static List<GovernanceViolation> run(
    GovernancePolicy policy,
    GovernanceRunContext context,
  ) {
    final violations = <GovernanceViolation>[];

    if (context.changeDescriptor != null) {
      final change = context.changeDescriptor!;
      final isBreaking = change.type == ChangeType.softBreak ||
          change.type == ChangeType.hardBreak ||
          change.type == ChangeType.coreBreak;
      if (isBreaking) {
        try {
          BreakingChangeGuard.enforceBreakingDeclaration(
            change: change,
            manifest: policy.breakingManifest,
          );
        } catch (e) {
          violations.add(GovernanceViolation(
            id: 'G1_BREAKING_WITHOUT_DECLARATION',
            scope: change.scope.name,
            rule: 'Gate1',
            severity: GovernanceViolationSeverity.error,
            description: 'Breaking change without matching declaration: $e',
            suggestedFix: 'Add a BreakingChangeDescriptor to the manifest.',
          ));
        }
      }
    }

    if (context.changeDescriptor != null &&
        context.proposedFlowVersion != null &&
        context.proposedCoreVersion != null) {
      final change = context.changeDescriptor!;
      final currentFlow = policy.currentFlowVersion;
      final proposedFlow = context.proposedFlowVersion!;
      final expectedFlow = _expectedNextVersion(currentFlow, change.type, change.scope);
      if (expectedFlow != null &&
          VersionComparator.compareTo(proposedFlow, expectedFlow) != 0) {
        violations.add(GovernanceViolation(
          id: 'G2_VERSION_BUMP_INVALID',
          scope: change.scope.name,
          rule: 'Gate2',
          severity: GovernanceViolationSeverity.error,
          description: 'Proposed Flow version $proposedFlow does not match expected $expectedFlow for ${change.type.name}.',
          suggestedFix: 'Bump version according to G1 rules for ${change.type.name}.',
        ));
      }
    }

    if (context.proposedFlowVersion != null || context.proposedCoreVersion != null) {
      final version = context.proposedFlowVersion ?? context.proposedCoreVersion!;
      final covered = policy.compatibilityMatrix.entries.any((e) =>
          e.source.contains(version) || e.target.contains(version));
      if (!covered) {
        violations.add(GovernanceViolation(
          id: 'G3_COMPATIBILITY_DRIFT',
          scope: 'matrix',
          rule: 'Gate3',
          severity: GovernanceViolationSeverity.error,
          description: 'Proposed version $version not covered by compatibility matrix.',
          suggestedFix: 'Add a CompatibilityEntry covering $version.',
        ));
      }
    }

    for (final d in policy.deprecationRegistry.descriptors) {
      try {
        DeprecationValidator.validateDeprecation(d);
      } catch (e) {
        violations.add(GovernanceViolation(
          id: 'G4_DEPRECATION_SUNSET_INVALID',
          scope: d.scope.name,
          rule: 'Gate4',
          severity: GovernanceViolationSeverity.error,
          description: 'Deprecation ${d.identifier}: $e',
          suggestedFix: 'Set startVersion < sunsetVersion and valid sunset for scope.',
        ));
      }
    }

    for (final plugin in policy.registeredPlugins) {
      try {
        PluginValidator.validatePlugin(plugin);
        PluginValidator.validatePluginCompatibility(
          plugin,
          currentFlowVersion: policy.currentFlowVersion,
          currentCoreVersion: policy.currentCoreVersion,
        );
      } catch (e) {
        violations.add(GovernanceViolation(
          id: 'G5_PLUGIN_INCOMPATIBLE',
          scope: plugin.scope.name,
          rule: 'Gate5',
          severity: GovernanceViolationSeverity.error,
          description: 'Plugin ${plugin.pluginId}: $e',
          suggestedFix: 'Update compatibleFlowVersions/compatibleCoreVersions or remove plugin.',
        ));
      }
    }

    return List.unmodifiable(violations);
  }

  static Version? _expectedNextVersion(
    Version current,
    ChangeType type,
    ChangeScope scope,
  ) {
    switch (scope) {
      case ChangeScope.core:
        return Version(major: current.major + 1, minor: 0, patch: 0);
      case ChangeScope.flow:
      case ChangeScope.plugin:
        switch (type) {
          case ChangeType.hardBreak:
          case ChangeType.coreBreak:
            return Version(major: current.major + 1, minor: 0, patch: 0);
          case ChangeType.softBreak:
          case ChangeType.backwardCompatible:
            return Version(major: current.major, minor: current.minor + 1, patch: 0);
          case ChangeType.nonBreaking:
            return Version(major: current.major, minor: current.minor, patch: current.patch + 1);
        }
    }
  }
}
