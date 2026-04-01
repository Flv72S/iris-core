// ODA-3 — Scope validation. Delegates to ScopeDefinition.

import 'package:iris_flutter_app/core/distributed/replication/filtering/scope_definition.dart';

/// Validates scope definition and exposes scope hash.
class ScopeValidator {
  ScopeValidator._();

  static bool validateScope(ScopeDefinition scope) => ScopeDefinition.validateScope(scope);

  static String getScopeHash(ScopeDefinition scope) => ScopeDefinition.getScopeHash(scope);
}
