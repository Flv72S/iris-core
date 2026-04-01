// H9 - CI runner logic. No network.

import 'dart:io';

import 'package:iris_flutter_app/meta_governance_ci/meta_governance_ci_context.dart';
import 'package:iris_flutter_app/meta_governance_ci/meta_governance_diff_analyzer.dart';
import 'package:iris_flutter_app/meta_governance_ci/meta_governance_gate_engine.dart';
import 'package:iris_flutter_app/meta_governance_ci/meta_governance_report.dart';

void runMetaGovernanceCI(List<String> args) {
  final changedPaths = _parseChangedPaths(args);
  final diffResult = MetaGovernanceDiffAnalyzer.analyze(changedPaths);
  final context = MetaGovernanceCIContext.empty;
  final report = MetaGovernanceGateEngine.evaluate(
    diffResult: diffResult,
    context: context,
  );
  print(report.toText());
  exit(report.passed ? 0 : 1);
}

List<String> _parseChangedPaths(List<String> args) {
  for (final a in args) {
    if (a.startsWith('--changed-files=')) {
      final path = a.substring('--changed-files='.length);
      final f = File(path);
      if (f.existsSync()) {
        return f
            .readAsLinesSync()
            .map((s) => s.trim())
            .where((s) => s.isNotEmpty)
            .toList();
      }
    }
  }
  return args.where((a) => !a.startsWith('--')).toList();
}
