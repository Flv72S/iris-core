// G1 - Version bump rules by change type and scope. Deterministic.

import 'version.dart';
import 'version_scope_policy.dart';

enum ChangeType {
  nonBreaking,
  backwardCompatible,
  softBreak,
  hardBreak,
  coreBreak,
}

/// Computes next version from current version, change type, and scope.
class VersionBumpRules {
  VersionBumpRules._();

  static Version computeNextVersion(
    Version current,
    ChangeType changeType,
    ScopeType scope,
  ) {
    switch (scope) {
      case ScopeType.core:
        return Version(major: current.major + 1, minor: 0, patch: 0);
      case ScopeType.flow:
        switch (changeType) {
          case ChangeType.hardBreak:
          case ChangeType.coreBreak:
            return Version(major: current.major + 1, minor: 0, patch: 0);
          case ChangeType.backwardCompatible:
          case ChangeType.softBreak:
            return Version(major: current.major, minor: current.minor + 1, patch: 0);
          case ChangeType.nonBreaking:
            return Version(major: current.major, minor: current.minor, patch: current.patch + 1);
        }
      case ScopeType.plugin:
        switch (changeType) {
          case ChangeType.hardBreak:
          case ChangeType.coreBreak:
            return Version(major: current.major + 1, minor: 0, patch: 0);
          case ChangeType.backwardCompatible:
          case ChangeType.softBreak:
            return Version(major: current.major, minor: current.minor + 1, patch: 0);
          case ChangeType.nonBreaking:
            return Version(major: current.major, minor: current.minor, patch: current.patch + 1);
        }
    }
  }
}
