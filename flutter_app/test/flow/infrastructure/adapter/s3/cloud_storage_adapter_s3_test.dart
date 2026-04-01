// K2 — Cloud Storage Adapter S3 tests. Mock S3 client; no production.

import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow/infrastructure/adapter/s3/cloud_storage_adapter_s3.dart';
import 'package:iris_flutter_app/flow/infrastructure/adapter/s3/s3_client_port.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/infrastructure_exception.dart';
import 'package:iris_flutter_app/flow/infrastructure/adapter/s3/in_memory_s3_client.dart';

void main() {
  group('K2 — Byte identity', () {
    test('upload then download yields identical length and content', () async {
      final client = InMemoryS3Client();
      final adapter = CloudStorageAdapterS3(client);
      const bucket = 'b1';
      const key = 'k1';
      final content = Uint8List.fromList([1, 2, 3, 4, 5, 0xff, 0x00]);

      await adapter.uploadObject(bucket, key, content);
      final downloaded = await adapter.downloadObject(bucket, key);

      expect(downloaded.length, content.length);
      expect(downloaded, content);
    });
  });

  group('K2 — Large payload', () {
    test('payload 1MB upload and download byte-identical', () async {
      final client = InMemoryS3Client();
      final adapter = CloudStorageAdapterS3(client);
      const bucket = 'b2';
      const key = 'k2';
      final content = Uint8List(1024 * 1024);
      for (var i = 0; i < content.length; i++) {
        content[i] = i % 256;
      }

      await adapter.uploadObject(bucket, key, content);
      final downloaded = await adapter.downloadObject(bucket, key);

      expect(downloaded.length, content.length);
      expect(downloaded, content);
    });
  });

  group('K2 — listObjects determinism', () {
    test('multiple objects with same prefix return sorted; stable on repeated calls', () async {
      final client = InMemoryS3Client();
      final adapter = CloudStorageAdapterS3(client);
      const bucket = 'b3';
      const prefix = 'p/';
      await adapter.uploadObject(bucket, '${prefix}z', [3]);
      await adapter.uploadObject(bucket, '${prefix}a', [1]);
      await adapter.uploadObject(bucket, '${prefix}m', [2]);

      final list1 = await adapter.listObjects(bucket, prefix: prefix);
      final list2 = await adapter.listObjects(bucket, prefix: prefix);

      expect(list1, orderedEquals(list2));
      expect(list1.length, 3);
      expect(list1, ['${prefix}a', '${prefix}m', '${prefix}z']);
    });
  });

  group('K2 — Exception mapping', () {
    test('client throwing results in StorageException; no SDK exception propagated', () async {
      final client = _ThrowingS3Client();
      final adapter = CloudStorageAdapterS3(client);

      expect(
        () => adapter.uploadObject('b', 'k', [1]),
        throwsA(isA<StorageException>()),
      );
      expect(
        () => adapter.downloadObject('b', 'k'),
        throwsA(isA<StorageException>()),
      );
      expect(
        () => adapter.listObjects('b'),
        throwsA(isA<StorageException>()),
      );
    });
  });

  group('K2 — No Core dependency', () {
    test('adapter module does not import iris.core', () {
      final file = File('lib/flow/infrastructure/adapter/s3/cloud_storage_adapter_s3.dart');
      if (!file.existsSync()) return;
      final content = file.readAsStringSync();
      expect(content.contains('package:iris_flutter_app/core'), isFalse);
    });
  });
}

class _ThrowingS3Client implements S3ClientPort {
  @override
  Future<void> putObject({
    required String bucket,
    required String key,
    Uint8List? body,
    int? contentLength,
  }) async {
    throw Exception('simulated SDK error');
  }

  @override
  Future<S3GetObjectResult?> getObject({
    required String bucket,
    required String key,
  }) async {
    throw Exception('simulated SDK error');
  }

  @override
  Future<void> headObject({
    required String bucket,
    required String key,
  }) async {
    throw Exception('simulated SDK error');
  }

  @override
  Future<void> deleteObject({
    required String bucket,
    required String key,
  }) async {
    throw Exception('simulated SDK error');
  }

  @override
  Future<S3ListObjectsResult> listObjectsV2({
    required String bucket,
    String? prefix,
    String? continuationToken,
  }) async {
    throw Exception('simulated SDK error');
  }
}
