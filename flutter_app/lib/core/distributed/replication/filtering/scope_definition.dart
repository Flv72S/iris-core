// ODA-3 — Deterministic filter definition. Pure, serializable, hashable.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

/// Supported scope types for partial replication. All must be deterministic.
enum ScopeType {
  entityId,
  eventType,
  domain,
  permissionScope,
  custom,
}

/// Deterministic scope definition. No time dependency; serializable and hashable.
class ScopeDefinition {
  const ScopeDefinition({
    required this.scopeType,
    required this.params,
  });

  static bool _paramsSerializable(Map<String, dynamic> p) {
    for (final v in p.values) {
      if (v is! String && v is! num && v is! bool && v is! List && v is! Map) return false;
      if (v is List) {
        for (final e in v) if (e is! String && e is! num && e is! bool) return false;
      }
    }
    return true;
  }

  final ScopeType scopeType;
  /// Serializable map: e.g. { 'entityIds': ['a','b'] }, { 'eventTypes': ['T1'] }, { 'predicateId': 'x', 'args': {} }.
  final Map<String, dynamic> params;

  /// Creates a scope from definition. Returns same scope if valid.
  static ScopeDefinition createScope(ScopeDefinition definition) {
    if (!validateScope(definition)) throw ArgumentError('Invalid scope definition');
    return definition;
  }

  /// Validates that scope is pure and deterministic (no time, valid type and params).
  static bool validateScope(ScopeDefinition scope) {
    if (!_paramsSerializable(scope.params)) return false;
    switch (scope.scopeType) {
      case ScopeType.entityId:
        return scope.params.containsKey('entityIds') &&
            scope.params['entityIds'] is List;
      case ScopeType.eventType:
        return scope.params.containsKey('eventTypes') &&
            scope.params['eventTypes'] is List;
      case ScopeType.domain:
        return scope.params.containsKey('domains') &&
            scope.params['domains'] is List;
      case ScopeType.permissionScope:
        return scope.params.containsKey('permissionScopes') &&
            scope.params['permissionScopes'] is List;
      case ScopeType.custom:
        return scope.params.containsKey('predicateId') &&
            scope.params['predicateId'] is String;
    }
  }

  /// Unique hash identifying filter logic. Same definition → same hash.
  static String getScopeHash(ScopeDefinition scope) {
    if (!validateScope(scope)) throw ArgumentError('Invalid scope');
    return CanonicalPayload.hash(<String, dynamic>{
      'scopeType': scope.scopeType.name,
      'params': scope.params,
    });
  }
}
