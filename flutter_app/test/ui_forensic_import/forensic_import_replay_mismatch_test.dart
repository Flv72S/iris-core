// Phase 11.6.2 — Records valid but metadata does not match replayed state → ReplayMismatchException.

import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/mappers/hash_utils.dart';
import 'package:iris_flutter_app/ui/forensic_export/forensic_bundle.dart';
import 'package:iris_flutter_app/ui/forensic_export/forensic_bundle_serializer.dart';
import 'package:iris_flutter_app/ui/forensic_import/forensic_bundle_importer.dart';
import 'package:iris_flutter_app/ui/forensic_import/forensic_import_exceptions.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_record.dart';
import 'package:iris_flutter_app/ui/time_model/logical_time.dart';

void main() {
  test('bundle with wrong exportedAtLogicalTime throws ReplayMismatchException',
      () {
    final records = <PersistenceRecord>[
      SessionStartRecord(sessionId: 'session-1'),
      TraceRecord(traceJson: <String, dynamic>{
        'traceId': 't1',
        'signals': <String, dynamic>{},
        'state': <String, dynamic>{},
        'resolution': 'r',
        'execution': <String, dynamic>{},
        'outcome': <String, dynamic>{'status': 'ok', 'effects': <dynamic>[]},
        'timestamp': '1970-01-01T00:00:00Z',
      }),
      TimeContextRecord(
          sessionId: 'session-1', tick: 1, origin: 'trace'),
    ];
    final contentForHash = <String, dynamic>{
      'bundleVersion': '1.0.0',
      'appVersion': '1.0.0',
      'exportedAtLogicalTime': <String, dynamic>{
        'tick': 99,
        'origin': 'trace',
      },
      'sessionId': 'session-1',
      'records': records.map((r) => r.toJson()).toList(),
    };
    final bundleHash = computeDeterministicHash(contentForHash);
    final bundle = ForensicBundle(
      bundleVersion: '1.0.0',
      appVersion: '1.0.0',
      exportedAtLogicalTime: const LogicalTime(tick: 99, origin: 'trace'),
      sessionId: 'session-1',
      records: records,
      bundleHash: bundleHash,
    );
    final jsonStr = ForensicBundleSerializer.toCanonicalJsonString(bundle);
    final bytes = Uint8List.fromList(utf8.encode(jsonStr));

    final importer = ForensicBundleImporter();
    expect(
      () => importer.importAndVerify(bytes),
      throwsA(isA<ReplayMismatchException>()),
    );
  });
}
