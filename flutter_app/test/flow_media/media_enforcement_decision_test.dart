// F-Media — MediaEnforcementDecision immutability.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_media/media_enforcement_decision.dart';

void main() {
  test('MediaEnforcementDecision is immutable', () {
    const d = MediaEnforcementDecision(
      uploadAllowed: true,
      localOnly: false,
      cloudAllowed: true,
      compressionRequired: true,
      coldArchiveAllowed: false,
      multiDeviceSyncAllowed: true,
      maxFileSizeBytes: 104857600,
    );
    expect(d.uploadAllowed, true);
    expect(d.cloudAllowed, true);
  });

  test('equality and hashCode', () {
    const a = MediaEnforcementDecision(
      uploadAllowed: true,
      localOnly: false,
      cloudAllowed: true,
      compressionRequired: false,
      coldArchiveAllowed: true,
      multiDeviceSyncAllowed: true,
      maxFileSizeBytes: 100,
    );
    const b = MediaEnforcementDecision(
      uploadAllowed: true,
      localOnly: false,
      cloudAllowed: true,
      compressionRequired: false,
      coldArchiveAllowed: true,
      multiDeviceSyncAllowed: true,
      maxFileSizeBytes: 100,
    );
    expect(a, b);
    expect(a.hashCode, b.hashCode);
  });

  test('restrictive is most restrictive', () {
    const r = MediaEnforcementDecision.restrictive;
    expect(r.uploadAllowed, false);
    expect(r.localOnly, true);
    expect(r.cloudAllowed, false);
    expect(r.maxFileSizeBytes, 0);
  });
}
