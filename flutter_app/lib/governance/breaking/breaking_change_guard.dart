// G4 - Guard: no breaking change without coherent declaration.

import 'package:iris_flutter_app/governance/change/change_descriptor.dart';
import 'package:iris_flutter_app/governance/change/change_scope.dart';
import 'package:iris_flutter_app/governance/change/change_type.dart';

import 'breaking_change_descriptor.dart';
import 'breaking_change_manifest.dart';

/// Thrown when a breaking change has no declaration or declaration is incoherent.
class BreakingChangeViolation implements Exception {
  BreakingChangeViolation(this.message);
  final String message;
  @override
  String toString() => 'BreakingChangeViolation: $message';
}

/// Enforces that soft/hard/core breaks have a coherent declaration in the manifest.
class BreakingChangeGuard {
  BreakingChangeGuard._();

  static bool _isBreaking(ChangeType type) {
    return type == ChangeType.softBreak ||
        type == ChangeType.hardBreak ||
        type == ChangeType.coreBreak;
  }

  static bool _targetVersionValidForCore(BreakingChangeDescriptor d) {
    return d.scope == ChangeScope.core &&
        d.type == ChangeType.coreBreak &&
        d.targetVersion.minor == 0 &&
        d.targetVersion.patch == 0;
  }

  /// Ensures breaking changes are declared and coherent. Non-breaking passes through.
  static void enforceBreakingDeclaration({
    required ChangeDescriptor change,
    required BreakingChangeManifest manifest,
  }) {
    if (!_isBreaking(change.type)) return;

    if (!manifest.validateAgainst(change)) {
      throw BreakingChangeViolation(
        'No matching breaking declaration for ${change.type.name} / ${change.scope.name}',
      );
    }

    final matching = manifest.declarations.where((d) {
      if (d.type != change.type || d.scope != change.scope) return false;
      final overlap = d.affectedComponents.toSet().intersection(change.affectedComponents.toSet()).isNotEmpty;
      return overlap;
    }).toList();

    if (matching.isEmpty) {
      throw BreakingChangeViolation('No declaration matches change');
    }

    for (final d in matching) {
      if (d.scope == ChangeScope.core && d.type == ChangeType.coreBreak) {
        if (d.targetVersion.minor != 0 || d.targetVersion.patch != 0) {
          throw BreakingChangeViolation(
            'CORE_BREAK targetVersion must be major.0.0, got ${d.targetVersion}',
          );
        }
      }
    }
  }
}
