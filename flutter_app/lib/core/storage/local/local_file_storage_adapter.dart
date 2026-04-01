import 'dart:io';

import 'package:iris_flutter_app/core/storage/storage_adapter.dart';

/// Local file storage using dart:io. Deterministic key → path.
/// Path strategy: ./iris_storage/<key>.bin
/// No DateTime, random naming, or environment branching.
class LocalFileStorageAdapter implements StorageAdapter {
  LocalFileStorageAdapter({String? basePath})
      : _basePath = basePath ?? './iris_storage';

  final String _basePath;

  String _pathForKey(String key) {
    return '$_basePath/$key.bin';
  }

  @override
  void saveBytes(String key, List<int> bytes) {
    final file = File(_pathForKey(key));
    file.parent.createSync(recursive: true);
    file.writeAsBytesSync(bytes);
  }

  @override
  List<int>? loadBytes(String key) {
    final file = File(_pathForKey(key));
    if (!file.existsSync()) return null;
    return file.readAsBytesSync();
  }

  @override
  void delete(String key) {
    final file = File(_pathForKey(key));
    if (file.existsSync()) {
      file.deleteSync();
    }
  }
}
