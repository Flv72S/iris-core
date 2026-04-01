// F-Media — MediaReference immutability and serialization.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_media/media_reference.dart';
import 'package:iris_flutter_app/flow_media/physical_location.dart';

void main() {
  test('MediaReference is immutable with const constructor', () {
    const ref = MediaReference(
      hash: 'sha256:abc123',
      sizeBytes: 1024,
      mimeType: 'image/png',
      mediaPolicyId: 'MEDIA_FREE_V1',
      location: PhysicalLocation.localDevice,
    );
    expect(ref.hash, 'sha256:abc123');
    expect(ref.sizeBytes, 1024);
    expect(ref.mimeType, 'image/png');
    expect(ref.mediaPolicyId, 'MEDIA_FREE_V1');
    expect(ref.location, PhysicalLocation.localDevice);
  });

  test('MediaReference equality and hashCode', () {
    const a = MediaReference(
      hash: 'sha256:abc',
      sizeBytes: 100,
      mimeType: 'video/mp4',
      mediaPolicyId: 'MEDIA_PRO_V1',
      location: PhysicalLocation.cloud,
    );
    const b = MediaReference(
      hash: 'sha256:abc',
      sizeBytes: 100,
      mimeType: 'video/mp4',
      mediaPolicyId: 'MEDIA_PRO_V1',
      location: PhysicalLocation.cloud,
    );
    const c = MediaReference(
      hash: 'sha256:xyz',
      sizeBytes: 100,
      mimeType: 'video/mp4',
      mediaPolicyId: 'MEDIA_PRO_V1',
      location: PhysicalLocation.cloud,
    );
    expect(a, b);
    expect(a.hashCode, b.hashCode);
    expect(a, isNot(c));
  });

  test('MediaReference toJson and fromJson roundtrip', () {
    const original = MediaReference(
      hash: 'sha256:test',
      sizeBytes: 2048,
      mimeType: 'audio/mp3',
      mediaPolicyId: 'MEDIA_ENTERPRISE_V1',
      location: PhysicalLocation.coldArchive,
    );
    final json = original.toJson();
    final restored = MediaReference.fromJson(json);
    expect(restored, original);
  });
}
