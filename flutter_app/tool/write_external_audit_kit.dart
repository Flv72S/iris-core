import 'dart:convert';
import 'dart:io';

import 'package:iris_flutter_app/certification/external_audit/external_audit_kit_content.dart';

void main() {
  final dir = Directory('certification/external_audit_kit');
  if (!dir.existsSync()) dir.createSync(recursive: true);
  final scriptsDir = Directory('certification/external_audit_kit/scripts');
  if (!scriptsDir.existsSync()) scriptsDir.createSync(recursive: true);

  final files = buildExternalAuditKitFiles();
  for (final entry in files.entries) {
    final path = 'certification/external_audit_kit/${entry.key}';
    final file = File(path);
    file.parent.createSync(recursive: true);
    file.writeAsStringSync(
      entry.value,
      encoding: utf8,
      flush: true,
    );
  }
  print('Wrote ${files.length} files to certification/external_audit_kit/');
}
