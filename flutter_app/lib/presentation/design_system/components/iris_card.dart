// Phase 11.1.2 — Presentational card. Style from tokens.

import 'package:flutter/material.dart';
import 'package:iris_flutter_app/presentation/design_system/tokens/spacing.dart';

class IrisCard extends StatelessWidget {
  const IrisCard({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 1,
      margin: const EdgeInsets.all(IrisSpacing.sm),
      child: Padding(
        padding: const EdgeInsets.all(IrisSpacing.md),
        child: child,
      ),
    );
  }
}
