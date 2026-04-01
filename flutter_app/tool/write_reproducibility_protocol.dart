import 'dart:convert';
import 'dart:io';

import 'package:iris_flutter_app/certification/independent/independent_reproducibility_protocol_content.dart';

void main() {
  final dir = Directory('certification/independent_reproducibility');
  if (!dir.existsSync()) dir.createSync(recursive: true);

  final files = buildProtocolFiles();
  for (final entry in files.entries) {
    File('${dir.path}/${entry.key}').writeAsStringSync(
      entry.value,
      encoding: utf8,
      flush: true,
    );
  }
  print('Wrote ${files.length} files to ${dir.path}');
}
