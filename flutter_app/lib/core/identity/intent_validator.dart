// OX6 — Permission check before allowing intent. Deterministic; no async.

import 'package:iris_flutter_app/core/identity/permission_engine.dart';

/// Validates that an identity has the required permission before an intent is applied.
/// Must be used by the intent layer before appending to ledger.
class IntentValidator {
  const IntentValidator(this._engine);

  final PermissionEngine _engine;

  /// Returns true iff [identityId] has [permission]. Use before allowing intent.
  bool canPerform(String identityId, String permission) {
    return _engine.hasPermission(identityId, permission);
  }
}
