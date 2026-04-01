// Phase 11.1.2 — Presentational text. Style from theme only. No logic.

import 'package:flutter/material.dart';

/// Text using design system typography. Deterministic rendering.
class IrisText extends StatelessWidget {
  const IrisText(
    this.data, {
    super.key,
    this.style,
    this.textAlign,
    this.maxLines,
  });

  final String data;
  final TextStyle? style;
  final TextAlign? textAlign;
  final int? maxLines;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final effectiveStyle = (theme.textTheme.bodyLarge ?? const TextStyle()).merge(style);
    return Text(
      data,
      style: effectiveStyle,
      textAlign: textAlign,
      maxLines: maxLines,
    );
  }
}
