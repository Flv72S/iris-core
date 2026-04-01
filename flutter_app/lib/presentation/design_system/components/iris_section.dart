// Phase 11.1.2 — Section container. Layout from spacing tokens. No logic.

import 'package:flutter/material.dart';
import 'package:iris_flutter_app/presentation/design_system/tokens/spacing.dart';

/// Section with deterministic spacing. Purely presentational.
class IrisSection extends StatelessWidget {
  const IrisSection({
    super.key,
    this.title,
    required this.child,
  });

  final String? title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: IrisSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (title != null) ...[
            Text(
              title!,
              style: theme.textTheme.titleMedium,
            ),
            const SizedBox(height: IrisSpacing.xs),
          ],
          child,
        ],
      ),
    );
  }
}
