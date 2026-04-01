// K2 — Wraps AWS S3 SDK to implement S3ClientPort.

import 'dart:typed_data';

import 'package:aws_s3_api/s3-2006-03-01.dart' as s3;
import 'package:iris_flutter_app/flow/infrastructure/adapter/s3/s3_client_port.dart';

/// Wraps [s3.S3] to implement [S3ClientPort]. Inject the real client from outside.
class AwsS3ClientAdapter implements S3ClientPort {
  AwsS3ClientAdapter(this._s3);

  final s3.S3 _s3;

  @override
  Future<void> putObject({
    required String bucket,
    required String key,
    Uint8List? body,
    int? contentLength,
  }) async {
    await _s3.putObject(
      bucket: bucket,
      key: key,
      body: body,
      contentLength: contentLength,
    );
  }

  @override
  Future<S3GetObjectResult?> getObject({
    required String bucket,
    required String key,
  }) async {
    final out = await _s3.getObject(bucket: bucket, key: key);
    return S3GetObjectResult(body: out.body);
  }

  @override
  Future<void> headObject({
    required String bucket,
    required String key,
  }) async {
    await _s3.headObject(bucket: bucket, key: key);
  }

  @override
  Future<void> deleteObject({
    required String bucket,
    required String key,
  }) async {
    await _s3.deleteObject(bucket: bucket, key: key);
  }

  @override
  Future<S3ListObjectsResult> listObjectsV2({
    required String bucket,
    String? prefix,
    String? continuationToken,
  }) async {
    final out = await _s3.listObjectsV2(
      bucket: bucket,
      prefix: prefix,
      continuationToken: continuationToken,
    );
    final contents = (out.contents ?? [])
        .map((o) => S3ObjectEntry(key: o.key))
        .toList();
    return S3ListObjectsResult(
      contents: contents,
      isTruncated: out.isTruncated == true,
      nextContinuationToken: out.nextContinuationToken,
    );
  }
}
