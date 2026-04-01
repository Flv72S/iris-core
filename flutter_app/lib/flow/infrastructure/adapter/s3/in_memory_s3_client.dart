// K2 — In-memory S3 client for tests. Implements S3ClientPort; deterministic.

import 'dart:typed_data';

import 'package:iris_flutter_app/flow/infrastructure/adapter/s3/s3_client_port.dart';

/// In-memory implementation of [S3ClientPort]. For tests only; no network.
class InMemoryS3Client implements S3ClientPort {
  final _store = <String, Uint8List>{};

  String _key(String bucket, String key) => '$bucket/$key';

  @override
  Future<void> putObject({
    required String bucket,
    required String key,
    Uint8List? body,
    int? contentLength,
  }) async {
    _store[_key(bucket, key)] = body ?? Uint8List(0);
  }

  @override
  Future<S3GetObjectResult?> getObject({
    required String bucket,
    required String key,
  }) async {
    final bytes = _store[_key(bucket, key)];
    if (bytes == null) return null;
    return S3GetObjectResult(body: Uint8List.fromList(bytes));
  }

  @override
  Future<void> headObject({
    required String bucket,
    required String key,
  }) async {
    if (!_store.containsKey(_key(bucket, key))) {
      throw _NotFound();
    }
  }

  @override
  Future<void> deleteObject({
    required String bucket,
    required String key,
  }) async {
    _store.remove(_key(bucket, key));
  }

  @override
  Future<S3ListObjectsResult> listObjectsV2({
    required String bucket,
    String? prefix,
    String? continuationToken,
  }) async {
    final keys = <String>[];
    final bucketPrefix = '$bucket/';
    for (final k in _store.keys) {
      if (!k.startsWith(bucketPrefix)) continue;
      final keyPart = k.substring(bucketPrefix.length);
      if (prefix == null || prefix.isEmpty || keyPart.startsWith(prefix)) {
        keys.add(keyPart);
      }
    }
    return S3ListObjectsResult(
      contents: keys.map((k) => S3ObjectEntry(key: k)).toList(),
      isTruncated: false,
    );
  }
}

class _NotFound implements Exception {
  @override
  String toString() => 'NotFound';
}
