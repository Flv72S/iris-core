// OX6 — Multi-device binding. DeviceId deterministically derived; revocation append-only.

import 'package:iris_flutter_app/core/deterministic/utils/canonical_serializer.dart';
import 'package:iris_flutter_app/core/deterministic/utils/deterministic_hash.dart';

/// Deterministic device ID from identity and device descriptor (e.g. device public key). No random generation.
String deterministicDeviceId(String identityId, String deviceDescriptor) {
  final envelope = <String, dynamic>{
    'type': 'device',
    'identityId': identityId,
    'deviceDescriptor': deviceDescriptor,
  };
  final bytes = CanonicalSerializer.canonicalSerialize(envelope);
  final h = DeterministicHash.computeDeterministicHash(bytes);
  final unsigned = h >= 0 ? h : (h + 0x100000000) & 0xffffffff;
  return 'device_${unsigned.toRadixString(16)}';
}

/// Device binding. Revocation is append-only; device cannot act if revoked.
class DeviceBinding {
  const DeviceBinding({
    required this.identityId,
    required this.deviceId,
    required this.registeredAtHeight,
    this.revokedAtHeight,
  });

  final String identityId;
  final String deviceId;
  final int registeredAtHeight;
  final int? revokedAtHeight;

  bool get isRevoked => revokedAtHeight != null;
}
