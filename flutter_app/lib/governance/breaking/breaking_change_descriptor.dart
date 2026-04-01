// G4 - Breaking change descriptor. Formal declaration.

import 'package:iris_flutter_app/governance/change/change_scope.dart';
import 'package:iris_flutter_app/governance/change/change_type.dart';
import 'package:iris_flutter_app/governance/versioning/version.dart';

class BreakingChangeDescriptor {
  const BreakingChangeDescriptor({
    required this.type,
    required this.scope,
    required this.targetVersion,
    required this.rationale,
    required this.affectedComponents,
  });

  final ChangeType type;
  final ChangeScope scope;
  final Version targetVersion;
  final String rationale;
  final List<String> affectedComponents;

  Map<String, Object> toJson() => {
        'type': type.name,
        'scope': scope.name,
        'targetVersion': targetVersion.toString(),
        'rationale': rationale,
        'affectedComponents': List<String>.from(affectedComponents),
      };

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is BreakingChangeDescriptor &&
          type == other.type &&
          scope == other.scope &&
          targetVersion == other.targetVersion &&
          rationale == other.rationale &&
          _listEq(affectedComponents, other.affectedComponents));

  static bool _listEq(List<String> a, List<String> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] != b[i]) return false;
    return true;
  }

  @override
  int get hashCode => Object.hash(type, scope, targetVersion, rationale, Object.hashAll(affectedComponents));
}
