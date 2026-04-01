// G7 - Version comparison.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/meta_governance/extensions/media_governance/media_storage_policy.dart';
import 'package:iris_flutter_app/meta_governance/extensions/media_governance/retention_policy.dart';
import 'package:iris_flutter_app/meta_governance/extensions/media_governance/storage_mode.dart';

void main() {
  MediaStoragePolicy p(String v) => MediaStoragePolicy(
        id: 'P',
        version: v,
        storageMode: StorageMode.deviceOnly,
        maxFileSizeMB: 10,
        retentionPolicy: RetentionLocalOnly(),
        compressionRequired: false,
        multiDeviceSync: false,
        coldArchiveEnabled: false,
      );

  test('compareVersions same -> 0', () {
    expect(MediaStoragePolicy.compareVersions(p('1.0.0'), p('1.0.0')), 0);
  });
  test('compareVersions a < b -> -1', () {
    expect(MediaStoragePolicy.compareVersions(p('1.0.0'), p('1.1.0')), -1);
  });
  test('compareVersions a > b -> 1', () {
    expect(MediaStoragePolicy.compareVersions(p('2.0.0'), p('1.0.0')), 1);
  });
}
