// G2 - Compatibility checker. Deterministic; no auto-upgrade.

import 'package:iris_flutter_app/governance/versioning/version.dart';

import 'compatibility_entry.dart';
import 'compatibility_matrix.dart';
import 'compatibility_scope.dart';

/// Returns true iff an entry in the matrix matches (sourceVersion, targetVersion) for the scope.
class CompatibilityChecker {
  CompatibilityChecker(this.matrix);

  final CompatibilityMatrix matrix;

  bool isCompatible({
    required Version sourceVersion,
    required Version targetVersion,
    required CompatibilityScope scope,
  }) {
    for (final entry in matrix.entries) {
      if (entry.scope != scope) continue;
      if (entry.source.contains(sourceVersion) &&
          entry.target.contains(targetVersion)) {
        return true;
      }
    }
    return false;
  }
}
