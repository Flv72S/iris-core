// Phase 11.8.1 — Static failure UI. No animation, no async, no system time. Forensic-safe.

import 'package:flutter/material.dart';

import 'certification_gate_result.dart';
import 'certification_gate_state.dart';

/// Deterministic screen shown when certification gate is closed. Data from result only.
class CertificationFailureScreen extends StatelessWidget {
  const CertificationFailureScreen({super.key, required this.result});

  final CertificationGateResult result;

  static String _stateLabel(CertificationGateState state) {
    switch (state) {
      case CertificationGateState.open:
        return 'open';
      case CertificationGateState.closedInvalidPack:
        return 'closedInvalidPack';
      case CertificationGateState.closedHashMismatch:
        return 'closedHashMismatch';
      case CertificationGateState.closedMissingBundle:
        return 'closedMissingBundle';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                'Certification gate closed',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 16),
              Text('State: ${_stateLabel(result.state)}'),
              if (result.bundleHash != null) ...[
                const SizedBox(height: 8),
                Text('Bundle hash: ${result.bundleHash}'),
              ],
              if (result.packHash != null) ...[
                const SizedBox(height: 8),
                Text('Pack hash: ${result.packHash}'),
              ],
              if (result.reason != null) ...[
                const SizedBox(height: 8),
                Text('Reason: ${result.reason}'),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
