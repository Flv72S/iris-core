// G3 - Change descriptor. Declarative input; immutable.

import 'change_scope.dart';
import 'change_type.dart';

/// Declared change: type, scope, description, affected components.
class ChangeDescriptor {
  const ChangeDescriptor({
    required this.type,
    required this.scope,
    required this.description,
    required this.affectedComponents,
  });

  final ChangeType type;
  final ChangeScope scope;
  final String description;
  final List<String> affectedComponents;

  Map<String, Object> toJson() => {
        'type': type.name,
        'scope': scope.name,
        'description': description,
        'affectedComponents': List<String>.from(affectedComponents),
      };

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is ChangeDescriptor &&
          type == other.type &&
          scope == other.scope &&
          description == other.description &&
          _listEq(affectedComponents, other.affectedComponents));

  static bool _listEq(List<String> a, List<String> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  @override
  int get hashCode => Object.hash(type, scope, description, Object.hashAll(affectedComponents));
}
