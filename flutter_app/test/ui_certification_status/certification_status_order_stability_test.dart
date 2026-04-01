// Microstep 12.1 — Capabilities order preserved in serialization.

import 'package:iris_flutter_app/ui/certification_status/certification_capability.dart';
import 'package:iris_flutter_app/ui/certification_status/certification_status.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('capabilities order preserved after toJson/fromJson', () {
    const s = CertificationStatus.defaultStatus;
    final json = s.toJson();
    final caps = json['capabilities'] as List<dynamic>;
    expect(caps.length, s.capabilities.length);
    for (var i = 0; i < s.capabilities.length; i++) {
      expect(caps[i], equals(s.capabilities[i].code));
    }
    final restored = CertificationStatus.fromJson(
      Map<String, dynamic>.from(json),
    );
    expect(restored.capabilities.length, s.capabilities.length);
    for (var i = 0; i < s.capabilities.length; i++) {
      expect(restored.capabilities[i], equals(s.capabilities[i]));
    }
  });
}
