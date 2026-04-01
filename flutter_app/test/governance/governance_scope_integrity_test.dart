// G0 - Scope integrity: one primary per scope; immutable scopes have no mutative actions.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/governance/governance_authority.dart';
import 'package:iris_flutter_app/governance/governance_registry.dart';
import 'package:iris_flutter_app/governance/governance_scope.dart';

void main() {
  final scopes = canonicalScopes;
  final authorities = canonicalAuthorities;

  test('every scope has exactly one primary authority', () {
    for (final scope in scopes) {
      final primaries = authorities
          .where((a) => a.primaryScopeId == scope.scopeId && a.role == AuthorityRole.primary)
          .toList();
      expect(primaries.length, 1, reason: 'Scope ${scope.scopeId.name} must have exactly one primary authority');
    }
  });

  test('every scope has at least one responsible authority', () {
    for (final scope in scopes) {
      final responsible = authorities
          .where((a) => a.primaryScopeId == scope.scopeId)
          .toList();
      expect(responsible.isNotEmpty, true, reason: 'Scope ${scope.scopeId.name} must have at least one authority');
    }
  });

  test('no scope has more than one primary authority', () {
    final byScope = <ScopeId, int>{};
    for (final a in authorities) {
      if (a.role == AuthorityRole.primary) {
        byScope[a.primaryScopeId] = (byScope[a.primaryScopeId] ?? 0) + 1;
      }
    }
    for (final entry in byScope.entries) {
      expect(entry.value, 1, reason: 'Scope ${entry.key.name} has ${entry.value} primaries');
    }
  });

  test('immutable scopes have no mutative actions in primary authority permitted list', () {
    final immutableScopes = scopes.where((s) => s.mutability == ScopeMutability.immutable).toList();
    for (final scope in immutableScopes) {
      final primary = authorities
          .where((a) => a.primaryScopeId == scope.scopeId && a.role == AuthorityRole.primary)
          .single;
      for (final action in primary.permittedActions) {
        expect(
          mutativeActionKinds.contains(action),
          false,
          reason: 'Scope ${scope.scopeId.name} primary ${primary.authorityId.name} must not permit mutative action ${action.name}',
        );
      }
    }
  });
}
