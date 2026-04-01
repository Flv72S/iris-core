// Phase 11.1.3 — History. Design system only.

import 'package:flutter/material.dart';
import 'package:iris_flutter_app/presentation/design_system/components/iris_section.dart';
import 'package:iris_flutter_app/presentation/design_system/components/iris_text.dart';

class HistoryScreen extends StatelessWidget {
  const HistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('History')),
      body: const IrisSection(
        title: 'History',
        child: IrisText('Decision history — placeholder'),
      ),
    );
  }
}
