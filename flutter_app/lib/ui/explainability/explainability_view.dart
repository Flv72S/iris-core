// Phase 11.5.2 — Read-only explainability viewer. Step back/forward, jump slider. No edit, no mutating gestures.

import 'package:flutter/material.dart';
import 'package:iris_flutter_app/ui/explainability/explainability_controller.dart';
import 'package:iris_flutter_app/ui/explainability/explainability_record_renderer.dart';
import 'package:iris_flutter_app/ui/explainability/explainability_state.dart';

/// Offline explainability viewer. Displays SessionId, LogicalTime, current record, navigation stack, progress.
class ExplainabilityView extends StatelessWidget {
  const ExplainabilityView({super.key, required this.controller});

  final ExplainabilityController controller;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: controller,
      builder: (context, _) {
        final state = controller.current;
        if (state == null) {
          return const Scaffold(
            body: Center(child: Text('Load persistence to view explainability')),
          );
        }
        return Scaffold(
          appBar: AppBar(title: const Text('Explainability (read-only)')),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _Section(title: 'Session', child: Text(state.timeContext.sessionId.value)),
                const SizedBox(height: 12),
                _Section(
                  title: 'Logical time',
                  child: Text(
                    'tick: ${state.timeContext.currentTime.tick}, origin: ${state.timeContext.currentTime.origin}',
                  ),
                ),
                const SizedBox(height: 12),
                _Section(
                  title: 'Progress',
                  child: Text('${state.currentIndex + 1} / ${state.totalSteps > 0 ? state.totalSteps : 1}'),
                ),
                const SizedBox(height: 12),
                if (state.currentRecord != null)
                  _Section(
                    title: 'Current record',
                    child: ExplainabilityRecordRenderer(record: state.currentRecord!),
                  ),
                if (state.currentRecord != null) const SizedBox(height: 12),
                _Section(
                  title: 'Navigation stack',
                  child: Text(state.navigationStack.isEmpty ? '(empty)' : state.navigationStack.join(' → ')),
                ),
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back),
                      onPressed: state.currentIndex > 0 ? () => controller.stepBackward() : null,
                    ),
                    Slider(
                      value: state.totalSteps > 1
                          ? state.currentIndex / (state.totalSteps - 1)
                          : 0,
                      onChanged: state.totalSteps > 1
                          ? (v) => controller.jumpTo((v * (state.totalSteps - 1)).round())
                          : null,
                    ),
                    IconButton(
                      icon: const Icon(Icons.arrow_forward),
                      onPressed: state.currentIndex < state.totalSteps - 1 ? () => controller.stepForward() : null,
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 4),
        child,
      ],
    );
  }
}
