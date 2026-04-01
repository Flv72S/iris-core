// Phase 11.5.2 — Pure renderer for persistence records. Read-only display.

import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_record.dart';

/// Renders a single PersistenceRecord: recordType, contentHash, payload JSON indented.
class ExplainabilityRecordRenderer extends StatelessWidget {
  const ExplainabilityRecordRenderer({super.key, required this.record});

  final PersistenceRecord record;

  @override
  Widget build(BuildContext context) {
    final json = record.toJson();
    final pretty = const JsonEncoder.withIndent('  ').convert(json);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text('type: ${record.recordType}', style: const TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        Text('hash: ${record.contentHash}', style: TextStyle(fontSize: 12, color: Colors.grey[600])),
        const SizedBox(height: 8),
        SelectableText(pretty, style: const TextStyle(fontFamily: 'monospace', fontSize: 12)),
      ],
    );
  }
}
