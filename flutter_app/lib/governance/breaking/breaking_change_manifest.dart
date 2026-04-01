// G4 - Breaking change manifest. Versionable list of declarations.

import 'package:iris_flutter_app/governance/change/change_descriptor.dart';
import 'package:iris_flutter_app/governance/change/change_scope.dart';
import 'package:iris_flutter_app/governance/change/change_type.dart';
import 'package:iris_flutter_app/governance/versioning/version.dart';

import 'breaking_change_descriptor.dart';

/// Manifest of breaking change declarations for a release. Versionable and traceable.
class BreakingChangeManifest {
  BreakingChangeManifest({
    required List<BreakingChangeDescriptor> declarations,
    Version? referenceVersion,
  })  : _declarations = List.unmodifiable(declarations),
        referenceVersion = referenceVersion;

  final List<BreakingChangeDescriptor> _declarations;
  final Version? referenceVersion;

  List<BreakingChangeDescriptor> get declarations => _declarations;

  /// Load a manifest from a list of descriptors (factory).
  static BreakingChangeManifest load(List<BreakingChangeDescriptor> declarations, {Version? referenceVersion}) {
    return BreakingChangeManifest(declarations: declarations, referenceVersion: referenceVersion);
  }

  /// True if there is a declaration that matches [change] (type, scope, overlapping components).
  bool validateAgainst(ChangeDescriptor change) {
    for (final d in _declarations) {
      if (d.type != change.type || d.scope != change.scope) continue;
      final overlap = d.affectedComponents.toSet().intersection(change.affectedComponents.toSet()).isNotEmpty;
      if (overlap) return true;
    }
    return false;
  }

  /// True if [newVersion] is consistent with this manifest (e.g. all descriptors have targetVersion == newVersion, or referenceVersion == newVersion).
  bool validateAgainstVersion(Version newVersion) {
    if (_declarations.isEmpty) return true;
    if (referenceVersion != null && referenceVersion == newVersion) return true;
    for (final d in _declarations) {
      if (d.targetVersion == newVersion) return true;
    }
    return false;
  }
}
