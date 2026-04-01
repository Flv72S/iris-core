// Phase 11.6.1 — Atomic write to file. .irisbundle.json, UTF-8, no compression, no encryption.

import 'dart:convert';
import 'dart:io';

import 'forensic_bundle.dart';
import 'forensic_bundle_serializer.dart';

/// Writes ForensicBundle to file. Atomic write; format .irisbundle.json; UTF-8. Does not decide destination.
class ForensicBundleWriter {
  /// Writes bundle to [filePath]. Atomic: write to temp then rename. No mutation of bundle or store.
  static Future<void> write(ForensicBundle bundle, String filePath) async {
    final content = ForensicBundleSerializer.toCanonicalJsonString(bundle);
    final file = File(filePath);
    final dir = file.parent;
    if (!await dir.exists()) {
      await dir.create(recursive: true);
    }
    final tempPath = '$filePath.tmp';
    final tempFile = File(tempPath);
    await tempFile.writeAsString(content, encoding: utf8);
    await tempFile.rename(filePath);
  }
}
