// Microstep 12.1 — fromJson validation.

import 'package:iris_flutter_app/ui/certification_status/certification_status.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('fromJson with empty capabilities throws ArgumentError', () {
    final json = <String, dynamic>{
      'version': '12.1',
      'capabilities': [],
      'generatedBy': 'IRIS Certification Runtime',
    };
    expect(
      () => CertificationStatus.fromJson(json),
      throwsArgumentError,
    );
  });

  test('fromJson with missing capabilities throws ArgumentError', () {
    final json = <String, dynamic>{
      'version': '12.1',
      'generatedBy': 'IRIS Certification Runtime',
    };
    expect(
      () => CertificationStatus.fromJson(json),
      throwsArgumentError,
    );
  });

  test('fromJson with empty version throws ArgumentError', () {
    final json = <String, dynamic>{
      'version': '',
      'capabilities': ['deterministic_replay'],
      'generatedBy': 'IRIS Certification Runtime',
    };
    expect(
      () => CertificationStatus.fromJson(json),
      throwsArgumentError,
    );
  });
}
