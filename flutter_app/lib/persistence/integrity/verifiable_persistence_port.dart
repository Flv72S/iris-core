// J5 — Port for integrity verification (extends persistence with hash-indexed read).

import 'package:iris_flutter_app/persistence/integrity/get_raw_result.dart';
import 'package:iris_flutter_app/persistence/integrity/record_type.dart';
import 'package:iris_flutter_app/persistence/port/persistence_port.dart';

/// Port that supports listing hashes and reading raw record content for verification.
/// Implemented by adapters that store records by hash (e.g. FileSystem).
abstract interface class VerifiablePersistencePort implements PersistencePort {
  /// Lists all record hashes for [type], in alphabetical order.
  List<String> listHashes(RecordType type);

  /// Returns raw record content for verification; does not modify files.
  GetRawResult getRawRecord(RecordType type, String hashFromFilename);
}
