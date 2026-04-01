// Microstep 12.1 — Round-trip JSON and determinism.

import 'package:iris_flutter_app/ui/certification_status/certification_status.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('defaultStatus toJson fromJson round-trip equals original', () {
    const s = CertificationStatus.defaultStatus;
    final json = s.toJson();
    final restored = CertificationStatus.fromJson(
      Map<String, dynamic>.from(json),
    );
    expect(restored, equals(s));
    expect(restored.hashCode, equals(s.hashCode));
  });

  test('two accesses to defaultStatus yield same hashCode', () {
    final h1 = CertificationStatus.defaultStatus.hashCode;
    final h2 = CertificationStatus.defaultStatus.hashCode;
    expect(h1, equals(h2));
  });
}
