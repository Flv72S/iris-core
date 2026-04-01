// G1 - Scope version policy. Core = major only.

import 'version.dart';

enum ScopeType { core, flow, plugin }

class VersionScopePolicy {
  VersionScopePolicy._();

  static bool isValidVersionForScope(Version version, ScopeType scope) {
    switch (scope) {
      case ScopeType.core:
        return version.minor == 0 && version.patch == 0;
      case ScopeType.flow:
      case ScopeType.plugin:
        return true;
    }
  }
}
