// G0 — Governance authority. Declarative mapping; no decision logic.

import 'governance_scope.dart';

/// Canonical authority identifier. Aligned with GOVERNANCE_AUTHORITY.md.
enum AuthorityId {
  coreCouncil,
  flowMaintainers,
  pluginAuthors,
  uxOwners,
  platformDevops,
}

/// Role of the authority for a scope.
enum AuthorityRole {
  primary,
  secondary,
}

/// Action identifier. Used in permitted/forbidden lists.
enum ActionKind {
  proposeCoreEvolution,
  approveCoreEvolution,
  changeFlowWithinCompatibility,
  updateManifestSeal,
  publishPlugin,
  changeUxWithinContract,
  runValidator,
  storeBaseline,
  escalateToCoreCouncil,
  escalateToFlowMaintainers,
}

/// Single authority definition: scope mapping and action rules.
class GovernanceAuthority {
  const GovernanceAuthority({
    required this.authorityId,
    required this.primaryScopeId,
    required this.role,
    required this.permittedActions,
    this.forbiddenActions = const [],
    this.escalationTarget,
  });

  final AuthorityId authorityId;
  final ScopeId primaryScopeId;
  final AuthorityRole role;
  final List<ActionKind> permittedActions;
  final List<ActionKind> forbiddenActions;
  final AuthorityId? escalationTarget;

  Map<String, Object> toJson() => {
        'authorityId': authorityId.name,
        'primaryScopeId': primaryScopeId.name,
        'role': role.name,
        'permittedActions': permittedActions.map((a) => a.name).toList(),
        'forbiddenActions': forbiddenActions.map((a) => a.name).toList(),
        if (escalationTarget != null) 'escalationTarget': escalationTarget!.name,
      };

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is GovernanceAuthority &&
          authorityId == other.authorityId &&
          primaryScopeId == other.primaryScopeId &&
          role == other.role &&
          _actionListEq(permittedActions, other.permittedActions) &&
          _actionListEq(forbiddenActions, other.forbiddenActions) &&
          escalationTarget == other.escalationTarget);

  static bool _actionListEq(List<ActionKind> a, List<ActionKind> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  @override
  int get hashCode => Object.hash(
        authorityId,
        primaryScopeId,
        role,
        Object.hashAll(permittedActions),
        Object.hashAll(forbiddenActions),
        escalationTarget,
      );
}

/// Direct mutative actions: forbidden for primary authority of IMMUTABLE scopes.
/// Protocol actions (proposeCoreEvolution, approveCoreEvolution) are allowed for Core.
const mutativeActionKinds = <ActionKind>{
  ActionKind.changeFlowWithinCompatibility,
  ActionKind.updateManifestSeal,
  ActionKind.publishPlugin,
  ActionKind.changeUxWithinContract,
  ActionKind.storeBaseline,
};
