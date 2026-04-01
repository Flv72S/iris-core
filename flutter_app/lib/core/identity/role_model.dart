// OX6 — Role abstraction. Maps roles to permissions; deterministic resolution.

/// Role definition: roleId and its permission set.
class RoleDefinition {
  const RoleDefinition({required this.roleId, required this.permissions});

  final String roleId;
  final List<String> permissions;
}

/// Registers roles and maps roles to permissions. No dynamic mutation without event.
/// Role definitions are fixed (or loaded from config); deterministic resolution.
class RoleModel {
  RoleModel({Map<String, List<String>>? rolePermissions}) : _rolePermissions = rolePermissions ?? _defaultRolePermissions;

  final Map<String, List<String>> _rolePermissions;

  static const Map<String, List<String>> _defaultRolePermissions = {
    'admin': ['*'],
    'editor': ['read', 'write', 'task:edit', 'decision:vote', 'agreement:sign'],
    'viewer': ['read'],
    'caregiver': ['read', 'write', 'task:edit', 'agreement:sign'],
  };

  /// Returns the set of permissions for a role. Deterministic.
  List<String> getPermissionsForRole(String roleId) {
    final perms = _rolePermissions[roleId];
    if (perms == null) return [];
    if (perms.contains('*')) return ['*'];
    return List<String>.from(perms);
  }

  /// Resolves full permission set for a list of roles. Deterministic.
  Set<String> resolvePermissions(List<String> roles) {
    final set = <String>{};
    for (final role in roles) {
      set.addAll(getPermissionsForRole(role));
    }
    if (set.contains('*')) return {'*'};
    return set;
  }
}
