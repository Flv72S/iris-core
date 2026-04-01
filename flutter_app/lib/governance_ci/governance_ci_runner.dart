// G7 - CI runner. Load policy, analyze diff, run gates, exit 1 on ERROR.

import 'dart:io';

import 'package:iris_flutter_app/governance/breaking/breaking_change_manifest.dart';
import 'package:iris_flutter_app/governance/compatibility/compatibility_entry.dart';
import 'package:iris_flutter_app/governance/compatibility/compatibility_matrix.dart';
import 'package:iris_flutter_app/governance/compatibility/compatibility_scope.dart';
import 'package:iris_flutter_app/governance/compatibility/version_range.dart';
import 'package:iris_flutter_app/governance/deprecation/deprecation_registry.dart';
import 'package:iris_flutter_app/governance/versioning/version.dart';
import 'package:iris_flutter_app/governance_ci/governance_gate_engine.dart';
import 'package:iris_flutter_app/governance_ci/governance_git_diff_analyzer.dart';
import 'package:iris_flutter_app/governance_ci/governance_policy_loader.dart';
import 'package:iris_flutter_app/governance_ci/governance_violation_report.dart';

void main(List<String> args) {
  final baseRef = _arg(args, '--base') ?? 'main';
  final policy = _loadDefaultPolicy();
  final diffResult = _runGitDiff(baseRef);
  final context = GovernanceRunContext(
    proposedCoreVersion: null,
    proposedFlowVersion: null,
    changeDescriptor: null,
    diffResult: diffResult,
  );
  final violations = GovernanceGateEngine.run(policy, context);
  _printReport(violations);
  final hasError = violations.any((v) => v.blocksCi);
  exit(hasError ? 1 : 0);
}

String? _arg(List<String> args, String name) {
  final i = args.indexOf(name);
  if (i >= 0 && i + 1 < args.length) return args[i + 1];
  return null;
}

GovernancePolicy _loadDefaultPolicy() {
  final v100 = Version(major: 1, minor: 0, patch: 0);
  final v1999 = Version(major: 1, minor: 999, patch: 999);
  final rangeCore = VersionRange(minVersion: v100, maxVersion: v100);
  final rangeFlow = VersionRange(minVersion: v100, maxVersion: v1999);
  final entries = [
    CompatibilityEntry(
      scope: CompatibilityScope.coreToFlow,
      source: rangeCore,
      target: rangeFlow,
    ),
    CompatibilityEntry(
      scope: CompatibilityScope.flowToPlugin,
      source: rangeFlow,
      target: rangeFlow,
    ),
  ];
  final matrix = CompatibilityMatrix(entries);
  final deprecationRegistry = DeprecationRegistry([]);
  final breakingManifest = BreakingChangeManifest(declarations: []);
  return GovernancePolicyLoader.load(
    currentCoreVersion: v100,
    currentFlowVersion: v100,
    compatibilityMatrix: matrix,
    deprecationRegistry: deprecationRegistry,
    breakingManifest: breakingManifest,
    registeredPlugins: [],
  );
}

GovernanceDiffResult _runGitDiff(String baseRef) {
  try {
    final result = Process.runSync(
      'git',
      ['diff', '--name-only', baseRef, 'HEAD'],
      runInShell: false,
    );
    if (result.exitCode != 0) return GovernanceDiffResult(changedFiles: const []);
    final lines = (result.stdout as String)
        .split('\n')
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty)
        .toList();
    return GovernanceGitDiffAnalyzer.fromPaths(lines);
  } catch (_) {
    return GovernanceDiffResult(changedFiles: const []);
  }
}

void _printReport(List<GovernanceViolation> violations) {
  if (violations.isEmpty) {
    print('Governance CI: 0 violations.');
    return;
  }
  print('Governance CI: ${violations.length} violation(s):');
  for (final v in violations) {
    print(v.toString());
  }
}
