// ODA-8 — Formal system invariant. Pure evaluation; immutable when activated.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

enum InvariantScope { cluster, domain, federation, economics }

class InvariantDefinition {
  const InvariantDefinition({
    required this.invariantId,
    required this.description,
    required this.scope,
    required this.version,
    required this.invariantHash,
  });

  final String invariantId;
  final String description;
  final InvariantScope scope;
  final int version;
  final String invariantHash;

  Map<String, dynamic> get payload => <String, dynamic>{
        'invariantId': invariantId,
        'description': description,
        'scope': scope.name,
        'version': version,
      };
}

class InvariantDefinitionFactory {
  InvariantDefinitionFactory._();

  static InvariantDefinition createInvariant({
    required String invariantId,
    required String description,
    required InvariantScope scope,
    required int version,
  }) {
    final payload = <String, dynamic>{
      'invariantId': invariantId,
      'description': description,
      'scope': scope.name,
      'version': version,
    };
    final invariantHash = CanonicalPayload.hash(payload);
    return InvariantDefinition(
      invariantId: invariantId,
      description: description,
      scope: scope,
      version: version,
      invariantHash: invariantHash,
    );
  }

  static bool verifyInvariant(InvariantDefinition inv) {
    final expected = CanonicalPayload.hash(inv.payload);
    return inv.invariantHash == expected;
  }

  static bool evaluateInvariant(
    InvariantDefinition inv,
    Map<String, dynamic> context,
    bool Function(Map<String, dynamic> context) validator,
  ) {
    return validator(context);
  }

  static String getInvariantHash(InvariantDefinition inv) => inv.invariantHash;
}
