/// O8 — Result of fork analysis. No state modification.

import 'package:iris_flutter_app/core/network/fork/fork_branch.dart';

/// Full fork metadata: common ancestor and both branches.
class ForkAnalysis {
  const ForkAnalysis({
    required this.commonAncestorHeight,
    required this.localBranch,
    required this.remoteBranch,
  });

  /// Ledger height (number of snapshots) at which both ledgers last agreed.
  final int commonAncestorHeight;

  final ForkBranch localBranch;
  final ForkBranch remoteBranch;
}
