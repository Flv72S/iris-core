// G7 - MediaStoragePolicy immutability.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/meta_governance/extensions/media_governance/media_storage_policy.dart';
import 'package:iris_flutter_app/meta_governance/extensions/media_governance/retention_policy.dart';
import 'package:iris_flutter_app/meta_governance/extensions/media_governance/storage_mode.dart';

void main() {
  test('MediaStoragePolicy is immutable (no setters, const constructor)', () {
    const policy = MediaStoragePolicy(
      id: 'MEDIA_FREE_V1',
      version: '1.0.0',
      storageMode: StorageMode.deviceOnly,
      maxFileSizeMB: 10,
      retentionPolicy: RetentionLocalOnly(),
      compressionRequired: true,
      multiDeviceSync: false,
      coldArchiveEnabled: false,
    );
    expect(policy.id, 'MEDIA_FREE_V1');
    expect(policy.version, '1.0.0');
    expect(policy.storageMode, StorageMode.deviceOnly);
    expect(policy.maxFileSizeMB, 10);
    expect(policy.retentionPolicy, isA<RetentionLocalOnly>());
    expect(policy.compressionRequired, isTrue);
    expect(policy.multiDeviceSync, isFalse);
    expect(policy.coldArchiveEnabled, isFalse);
  });

  test('RetentionDaysLimited stores days', () {
    const r = RetentionDaysLimited(365);
    expect(r.kind, 'DAYS_LIMITED');
    expect(r.days, 365);
  });
}
