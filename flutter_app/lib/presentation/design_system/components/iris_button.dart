// Phase 11.1.2 — Presentational button. No decision logic.

import 'package:flutter/material.dart';
import 'package:iris_flutter_app/presentation/design_system/tokens/spacing.dart';

class IrisButton extends StatelessWidget {
  const IrisButton({super.key, required this.label, this.onPressed});

  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      onPressed: onPressed,
      style: FilledButton.styleFrom(
        padding: const EdgeInsets.symmetric(
          horizontal: IrisSpacing.md,
          vertical: IrisSpacing.sm,
        ),
      ),
      child: Text(label),
    );
  }
}
