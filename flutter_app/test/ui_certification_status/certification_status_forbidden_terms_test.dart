// Microstep 12.1 — No normative/legal terms in model strings.

import 'package:iris_flutter_app/ui/certification_status/certification_capability.dart';
import 'package:iris_flutter_app/ui/certification_status/certification_status.dart';
import 'package:flutter_test/flutter_test.dart';

const _forbidden = [
  'compliant',
  'certified',
  'approved',
  'meets regulation',
];

void main() {
  test('defaultStatus and capability codes contain no forbidden terms', () {
    final strings = <String>[
      CertificationStatus.defaultStatus.version,
      CertificationStatus.defaultStatus.generatedBy,
      if (CertificationStatus.defaultStatus.description != null)
        CertificationStatus.defaultStatus.description!,
      ...CertificationStatus.defaultStatus.capabilities.map((c) => c.code),
    ];
    for (final s in strings) {
      final lower = s.toLowerCase();
      for (final term in _forbidden) {
        expect(
          lower.contains(term),
          isFalse,
          reason: 'Model string must not contain "$term": $s',
        );
      }
    }
  });
}
