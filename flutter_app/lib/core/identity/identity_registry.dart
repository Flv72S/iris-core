// OX6 — Identity lookup. Reads from projection only.

import 'package:iris_flutter_app/core/identity/identity_model.dart';
import 'package:iris_flutter_app/core/identity/device_binding.dart';
import 'package:iris_flutter_app/core/identity/identity_projection.dart';

/// Provides identity lookup. Must read from projection only.
class IdentityRegistry {
  const IdentityRegistry(this._state);

  final IdentityState _state;

  Identity? getIdentity(String identityId) => _state.getIdentity(identityId);

  List<Identity> getAllActive() => _state.getAllActive();

  List<DeviceBinding> getDevices(String identityId) => _state.getDevices(identityId);
}
