// K3 — Faulty S3 client for exception mapping tests. Throws on every call.

import 'dart:typed_data';

import 'package:iris_flutter_app/flow/infrastructure/adapter/s3/s3_client_port.dart';

/// S3 client that throws a custom exception on every operation.
/// Used to verify adapter maps to StorageException and does not expose SDK/custom types.
class FaultyS3Client implements S3ClientPort {
  FaultyS3Client({this.message = 'FaultyS3Client simulated failure'});
  final String message;

  @override
  Future<void> putObject({
    required String bucket,
    required String key,
    Uint8List? body,
    int? contentLength,
  }) async {
    throw _FaultyException(message);
  }

  @override
  Future<S3GetObjectResult?> getObject({
    required String bucket,
    required String key,
  }) async {
    throw _FaultyException(message);
  }

  @override
  Future<void> headObject({
    required String bucket,
    required String key,
  }) async {
    throw _FaultyException(message);
  }

  @override
  Future<void> deleteObject({
    required String bucket,
    required String key,
  }) async {
    throw _FaultyException(message);
  }

  @override
  Future<S3ListObjectsResult> listObjectsV2({
    required String bucket,
    String? prefix,
    String? continuationToken,
  }) async {
    throw _FaultyException(message);
  }
}

class _FaultyException implements Exception {
  _FaultyException(this.message);
  final String message;
  @override
  String toString() => 'FaultyException: $message';
}
