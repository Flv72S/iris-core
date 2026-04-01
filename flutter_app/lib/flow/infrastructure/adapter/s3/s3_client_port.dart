// K2 — Minimal S3 client interface for injection and testing. No SDK dependency.

import 'dart:typed_data';

/// Minimal S3-like client interface used by [CloudStorageAdapterS3].
/// Implementations: [AwsS3ClientAdapter] (real SDK), or in-memory fake in tests.
abstract interface class S3ClientPort {
  Future<void> putObject({
    required String bucket,
    required String key,
    Uint8List? body,
    int? contentLength,
  });

  Future<S3GetObjectResult?> getObject({
    required String bucket,
    required String key,
  });

  Future<void> headObject({
    required String bucket,
    required String key,
  });

  Future<void> deleteObject({
    required String bucket,
    required String key,
  });

  Future<S3ListObjectsResult> listObjectsV2({
    required String bucket,
    String? prefix,
    String? continuationToken,
  });
}

/// Result of getObject; body may be bytes or stream.
class S3GetObjectResult {
  S3GetObjectResult({this.body});
  final dynamic body; // Uint8List or Stream<List<int>>
}

/// Result of listObjectsV2.
class S3ListObjectsResult {
  S3ListObjectsResult({this.contents = const [], this.isTruncated = false, this.nextContinuationToken});
  final List<S3ObjectEntry> contents;
  final bool isTruncated;
  final String? nextContinuationToken;
}

class S3ObjectEntry {
  S3ObjectEntry({this.key});
  final String? key;
}
