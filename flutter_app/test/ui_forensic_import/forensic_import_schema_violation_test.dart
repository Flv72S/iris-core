// Phase 11.6.2 — Valid JSON but wrong schema → import rejected.

import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/ui/forensic_import/forensic_bundle_importer.dart';
import 'package:iris_flutter_app/ui/forensic_import/forensic_import_exceptions.dart';

void main() {
  test('JSON missing bundleVersion throws InvalidBundleFormatException', () {
    final json = <String, dynamic>{
      'appVersion': '1.0.0',
      'exportedAtLogicalTime': <String, dynamic>{'tick': 0, 'origin': 'x'},
      'sessionId': 'session-0',
      'records': <dynamic>[],
      'bundleHash': 'abc',
    };
    final bytes = Uint8List.fromList(utf8.encode(jsonEncode(json)));
    final importer = ForensicBundleImporter();
    expect(
      () => importer.importAndVerify(bytes),
      throwsA(isA<InvalidBundleFormatException>()),
    );
  });

  test('JSON root is array throws InvalidBundleFormatException', () {
    final bytes = Uint8List.fromList(utf8.encode('[1,2,3]'));
    final importer = ForensicBundleImporter();
    expect(
      () => importer.importAndVerify(bytes),
      throwsA(isA<InvalidBundleFormatException>()),
    );
  });

  test('invalid UTF-8 throws InvalidBundleFormatException', () {
    final bytes = Uint8List.fromList([0xFF, 0xFE, 0xFD]);
    final importer = ForensicBundleImporter();
    expect(
      () => importer.importAndVerify(bytes),
      throwsA(isA<InvalidBundleFormatException>()),
    );
  });
}
