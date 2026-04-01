// ODA-3 — Node-scope binding with signature.

import 'package:iris_flutter_app/core/distributed/replication/filtering/scope_definition.dart';

/// Associates a node with a scope. Binding must be signed.
class ReplicationScope {
  const ReplicationScope({
    required this.nodeId,
    required this.scopeHash,
    required this.scopeDefinition,
    required this.bindingSignature,
  });

  final String nodeId;
  final String scopeHash;
  final ScopeDefinition scopeDefinition;
  /// Signature over (nodeId, scopeHash) binding.
  final String bindingSignature;

  /// Builds scope binding for a node. Caller must sign payload to produce [bindingSignature].
  static ReplicationScope bindScopeToNode({
    required String nodeId,
    required ScopeDefinition scopeDefinition,
    required String bindingSignature,
  }) {
    final scopeHash = ScopeDefinition.getScopeHash(scopeDefinition);
    return ReplicationScope(
      nodeId: nodeId,
      scopeHash: scopeHash,
      scopeDefinition: scopeDefinition,
      bindingSignature: bindingSignature,
    );
  }

  /// Verifies that binding signature is valid for (nodeId, scopeHash).
  /// [verifySignature] should return true iff signature is valid for the canonical payload.
  static bool verifyScopeBinding(
    ReplicationScope scope,
    bool Function(String nodeId, String scopeHash, String signature) verifySignature,
  ) {
    return verifySignature(scope.nodeId, scope.scopeHash, scope.bindingSignature);
  }
}
