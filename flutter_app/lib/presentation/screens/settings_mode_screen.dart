// Phase 11.1.3 — Settings / mode placeholder. Design system only. No logic.

import 'package:flutter/material.dart';
import 'package:iris_flutter_app/presentation/design_system/components/iris_section.dart';
import 'package:iris_flutter_app/presentation/design_system/components/iris_text.dart';

class SettingsModeScreen extends StatelessWidget {
  const SettingsModeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: const IrisSection(
        title: 'Mode',
        child: IrisText('Mode settings — placeholder'),
      ),
    );
  }
}
