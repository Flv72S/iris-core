// OX6 — Deterministic permission check. IdentityProjection only; no async, no network.

import 'package:iris_flutter_app/core/identity/identity_projection.dart';
import 'package:iris_flutter_app/core/identity/role_model.dart';

/// Permission check from identity state and role model. Deterministic across nodes.
class PermissionEngine {
  PermissionEngine({required this.state, RoleModel? roleModel}) : _roleModel = roleModel ?? RoleModel();

  final IdentityState state;
  final RoleModel _roleModel;

  /// Returns true iff identity is active, has a role that grants [permission].
  /// No async, no network, no hidden state.
  bool hasPermission(String identityId, String permission) {
    final identity = state.getIdentity(identityId);
    if (identity == null || !identity.isActive) return false;
    final permissions = _roleModel.resolvePermissions(identity.roles);
    if (permissions.contains('*')) return true;
    return permissions.contains(permission);
  }
}
