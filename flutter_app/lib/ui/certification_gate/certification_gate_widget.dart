// Phase 11.8.1 — Gate widget: child if open, failure screen if closed.

import 'package:flutter/material.dart';

import 'certification_failure_screen.dart';
import 'certification_gate_result.dart';
import 'certification_gate_state.dart';

/// Renders child when gate is open; otherwise renders CertificationFailureScreen.
class CertificationGate extends StatelessWidget {
  const CertificationGate({
    super.key,
    required this.result,
    required this.child,
  });

  final CertificationGateResult result;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (result.state == CertificationGateState.open) {
      return child;
    }
    return CertificationFailureScreen(result: result);
  }
}
