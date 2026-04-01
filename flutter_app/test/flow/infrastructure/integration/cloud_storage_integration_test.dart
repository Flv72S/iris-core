// K3 — Infrastructure Integration Test Suite. Validates determinism and isolation.

import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow/infrastructure/adapter/s3/cloud_storage_adapter_s3.dart';
import 'package:iris_flutter_app/flow/infrastructure/adapter/s3/in_memory_s3_client.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/infrastructure_exception.dart';

import 'test_support/faulty_s3_client.dart';

void main() {
  group('K3 — 1. End-to-End Byte Identity', () {
    test('small UTF-8 payload: length and content identical', () async {
      final client = InMemoryS3Client();
      final adapter = CloudStorageAdapterS3(client);
      const bucket = 'int-b1';
      const key = 'k-utf8';
      final content = Uint8List.fromList(utf8.encode('Hello 世界 café'));

      await adapter.uploadObject(bucket, key, content);
      final downloaded = await adapter.downloadObject(bucket, key);

      expect(downloaded.length, content.length);
      expect(downloaded, content);
    });

    test('static binary payload (no Random): identical bytes', () async {
      final client = InMemoryS3Client();
      final adapter = CloudStorageAdapterS3(client);
      const bucket = 'int-b2';
      const key = 'k-bin';
      // Deterministic sequence: first 256 bytes = 0..255, then repeat
      final content = Uint8List(512);
      for (var i = 0; i < 512; i++) content[i] = i % 256;

      await adapter.uploadObject(bucket, key, content);
      final downloaded = await adapter.downloadObject(bucket, key);

      expect(downloaded.length, content.length);
      expect(downloaded, content);
    });

    test('5MB payload: byte-identical', () async {
      final client = InMemoryS3Client();
      final adapter = CloudStorageAdapterS3(client);
      const bucket = 'int-b3';
      const key = 'k-5mb';
      const size = 5 * 1024 * 1024;
      final content = Uint8List(size);
      for (var i = 0; i < size; i++) content[i] = i % 256;

      await adapter.uploadObject(bucket, key, content);
      final downloaded = await adapter.downloadObject(bucket, key);

      expect(downloaded.length, content.length);
      expect(downloaded, content);
    });
  });

  group('K3 — 2. Repeated Upload Determinism', () {
    test('same payload uploaded twice, download after each: identical bytes', () async {
      final client = InMemoryS3Client();
      final adapter = CloudStorageAdapterS3(client);
      const bucket = 'int-r1';
      const key = 'same-key';
      final content = Uint8List.fromList([10, 20, 30, 40, 50]);

      await adapter.uploadObject(bucket, key, content);
      final first = await adapter.downloadObject(bucket, key);
      await adapter.uploadObject(bucket, key, content);
      final second = await adapter.downloadObject(bucket, key);

      expect(first, content);
      expect(second, content);
      expect(first, second);
    });
  });

  group('K3 — 3. listObjects Deterministic Stability', () {
    test('multiple objects with same prefix, listObjects 3 times: same order', () async {
      final client = InMemoryS3Client();
      final adapter = CloudStorageAdapterS3(client);
      const bucket = 'int-l1';
      const prefix = 'p/';
      await adapter.uploadObject(bucket, '${prefix}z', [1]);
      await adapter.uploadObject(bucket, '${prefix}a', [2]);
      await adapter.uploadObject(bucket, '${prefix}m', [3]);

      final list1 = await adapter.listObjects(bucket, prefix: prefix);
      final list2 = await adapter.listObjects(bucket, prefix: prefix);
      final list3 = await adapter.listObjects(bucket, prefix: prefix);

      expect(list1, orderedEquals(list2));
      expect(list2, orderedEquals(list3));
      expect(list1.length, 3);
      expect(list1, ['${prefix}a', '${prefix}m', '${prefix}z']);
    });
  });

  group('K3 — 4. Delete Semantics', () {
    test('upload → exists true → delete → exists false; download after delete returns empty', () async {
      final client = InMemoryS3Client();
      final adapter = CloudStorageAdapterS3(client);
      const bucket = 'int-d1';
      const key = 'del-key';
      final content = Uint8List.fromList([1, 2, 3]);

      await adapter.uploadObject(bucket, key, content);
      expect(await adapter.objectExists(bucket, key), isTrue);

      await adapter.deleteObject(bucket, key);
      expect(await adapter.objectExists(bucket, key), isFalse);

      final downloaded = await adapter.downloadObject(bucket, key);
      expect(downloaded, isEmpty);
    });
  });

  group('K3 — 5. Exception Mapping Stability', () {
    test('FaultyS3Client: adapter throws StorageException; cause preserved', () async {
      final client = FaultyS3Client(message: 'simulated');
      final adapter = CloudStorageAdapterS3(client);

      try {
        await adapter.uploadObject('b', 'k', [1]);
        fail('expected StorageException');
      } on StorageException catch (e) {
        expect(e.message, isNotNull);
        expect(e.cause, isNotNull);
        expect(e, isA<StorageException>());
      }

      try {
        await adapter.downloadObject('b', 'k');
        fail('expected StorageException');
      } on StorageException catch (e) {
        expect(e.cause, isNotNull);
      }

      try {
        await adapter.objectExists('b', 'k');
        fail('expected StorageException');
      } on StorageException catch (e) {
        expect(e.cause, isNotNull);
      }

      try {
        await adapter.deleteObject('b', 'k');
        fail('expected StorageException');
      } on StorageException catch (e) {
        expect(e.cause, isNotNull);
      }

      try {
        await adapter.listObjects('b');
        fail('expected StorageException');
      } on StorageException catch (e) {
        expect(e.cause, isNotNull);
      }
    });
  });

  group('K3 — 6. No Core Dependency Guard', () {
    test('adapter dir has no import iris.core or persistence/replay/hash', () {
      final dir = Directory('lib/flow/infrastructure/adapter');
      if (!dir.existsSync()) return;
      final forbidden = [
        'package:iris_flutter_app/core',
        'package:iris_flutter_app/persistence',
        'package:iris_flutter_app/replay',
        'package:iris_flutter_app/hash',
      ];
      for (final entity in dir.listSync(recursive: true)) {
        if (entity is! File || !entity.path.endsWith('.dart')) continue;
        final content = entity.readAsStringSync();
        for (final pattern in forbidden) {
          expect(
            content.contains(pattern),
            isFalse,
            reason: '${entity.path} must not import $pattern',
          );
        }
      }
    });
  });

  group('K3 — 7. No Entropy Verification', () {
    test('adapter files do not use DateTime.now(), Uuid(), Random(), timestamp', () {
      final dir = Directory('lib/flow/infrastructure/adapter');
      if (!dir.existsSync()) return;
      final forbidden = [
        'DateTime.now()',
        'Uuid()',
        'Random()',
        '.now()',
        'Random(',
      ];
      for (final entity in dir.listSync(recursive: true)) {
        if (entity is! File || !entity.path.endsWith('.dart')) continue;
        final content = entity.readAsStringSync();
        for (final pattern in forbidden) {
          expect(
            content.contains(pattern),
            isFalse,
            reason: '${entity.path} must not contain $pattern',
          );
        }
      }
    });
  });

  group('K3 — 8. Adapter Isolation', () {
    test('CloudStorageAdapterS3 file imports only CloudStoragePort, S3ClientPort, StorageException; no replay/persistence/hash/forensic', () {
      final file = File('lib/flow/infrastructure/adapter/s3/cloud_storage_adapter_s3.dart');
      expect(file.existsSync(), isTrue);
      final content = file.readAsStringSync();
      expect(content.contains('CloudStoragePort'), isTrue);
      expect(content.contains('S3ClientPort'), isTrue);
      expect(content.contains('StorageException'), isTrue);
      expect(content.contains('ReplayEngine'), isFalse);
      expect(content.contains('PersistencePort'), isFalse);
      expect(content.contains('HashEngine'), isFalse);
      expect(content.contains('ForensicExportService'), isFalse);
      expect(content.contains('DeterministicHashEngine'), isFalse);
    });
  });
}
