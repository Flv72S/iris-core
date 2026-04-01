// K2 — Cloud Storage Adapter S3-compatible. Implements CloudStoragePort; client injected.

import 'dart:typed_data';

import 'package:iris_flutter_app/flow/infrastructure/adapter/s3/s3_client_port.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/cloud_storage_port.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/infrastructure_exception.dart';

/// S3-compatible implementation of [CloudStoragePort].
/// Client must be injected via [S3ClientPort]; no Content-Type, metadata, encryption, or retry.
/// Byte-identical upload/download; listObjects returns keys sorted lexicographically.
class CloudStorageAdapterS3 implements CloudStoragePort {
  CloudStorageAdapterS3(this._client);

  final S3ClientPort _client;

  @override
  Future<void> uploadObject(String bucket, String key, List<int> content) async {
    try {
      final body = Uint8List.fromList(content);
      await _client.putObject(
        bucket: bucket,
        key: key,
        body: body,
        contentLength: content.length,
      );
    } catch (e) {
      throw StorageException('uploadObject failed', e);
    }
  }

  @override
  Future<List<int>> downloadObject(String bucket, String key) async {
    try {
      final out = await _client.getObject(bucket: bucket, key: key);
      if (out == null) return [];
      final body = out.body;
      if (body == null) return [];
      if (body is Uint8List) return List<int>.from(body);
      if (body is Stream<List<int>>) {
        final chunks = await body.toList();
        final result = <int>[];
        for (final c in chunks) {
          result.addAll(c as Iterable<int>);
        }
        return result;
      }
      return [];
    } catch (e) {
      if (_isNotFound(e)) return [];
      throw StorageException('downloadObject failed', e);
    }
  }

  @override
  Future<bool> objectExists(String bucket, String key) async {
    try {
      await _client.headObject(bucket: bucket, key: key);
      return true;
    } catch (e) {
      if (_isNotFound(e)) return false;
      throw StorageException('objectExists failed', e);
    }
  }

  @override
  Future<void> deleteObject(String bucket, String key) async {
    try {
      await _client.deleteObject(bucket: bucket, key: key);
    } catch (e) {
      throw StorageException('deleteObject failed', e);
    }
  }

  @override
  Future<List<String>> listObjects(String bucket, {String prefix = ''}) async {
    try {
      final keys = <String>[];
      String? continuationToken;
      do {
        final out = await _client.listObjectsV2(
          bucket: bucket,
          prefix: prefix.isEmpty ? null : prefix,
          continuationToken: continuationToken,
        );
        for (final o in out.contents) {
          final k = o.key;
          if (k != null && k.isNotEmpty) keys.add(k);
        }
        continuationToken = out.isTruncated ? out.nextContinuationToken : null;
      } while (continuationToken != null);
      keys.sort();
      return keys;
    } catch (e) {
      throw StorageException('listObjects failed', e);
    }
  }

  bool _isNotFound(Object e) {
    if (e is Exception) {
      final s = e.toString();
      if (s.contains('404') || s.contains('NotFound') || s.contains('NoSuchKey')) return true;
    }
    return false;
  }
}
