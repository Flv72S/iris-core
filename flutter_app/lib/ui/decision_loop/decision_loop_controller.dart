// Phase 11.4.1 — Single linear pipeline: intent → trace → validate → save → notify. No client decision logic.

import 'package:iris_flutter_app/bridge/channel/intent_channel.dart';
import 'package:iris_flutter_app/bridge/contracts/bridge_contract.dart';
import 'package:iris_flutter_app/bridge/dto/decision_trace_dto.dart';
import 'package:iris_flutter_app/bridge/intents/action_intent.dart';
import 'package:iris_flutter_app/bridge/intents/mode_change_intent.dart';
import 'package:iris_flutter_app/bridge/replay_store/replay_trace_store.dart';
import 'package:iris_flutter_app/bridge/validation/trace_validator.dart';
import 'package:iris_flutter_app/bridge/validation/validated_trace_result.dart';

import 'package:iris_flutter_app/ui/persistence/persistence_record.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_store.dart';
import 'package:iris_flutter_app/ui/time_model/time_context_controller.dart';

import 'decision_loop_notifier.dart';
import 'decision_loop_result.dart';

/// Central controller: one deterministic pipeline. No branching on outcome, no repeated attempts, no fallback.
class DecisionLoopController {
  DecisionLoopController({
    required IntentChannel channel,
    required TraceValidator validator,
    required ReplayTraceStore store,
    required DecisionLoopNotifier notifier,
    TimeContextController? timeContextController,
    PersistenceStore? persistenceStore,
  })  : _channel = channel,
        _validator = validator,
        _store = store,
        _notifier = notifier,
        _timeContextController = timeContextController,
        _persistenceStore = persistenceStore;

  final IntentChannel _channel;
  final TraceValidator _validator;
  final ReplayTraceStore _store;
  final DecisionLoopNotifier _notifier;
  final TimeContextController? _timeContextController;
  final PersistenceStore? _persistenceStore;

  /// Linear pipeline: send → receive → validate → save if valid → persist → update time → notify.
  Future<DecisionLoopResult> executeAction(ActionIntent intent) async {
    final trace = await _channel.sendAction(intent);
    return _completePipeline(trace);
  }

  /// Linear pipeline: send → receive → validate → save if valid → persist → update time → notify.
  Future<DecisionLoopResult> executeModeChange(ModeChangeIntent intent) async {
    final trace = await _channel.sendModeChange(intent);
    return _completePipeline(trace);
  }

  /// Single path: validate; if invalid return without save/notify; if valid save, persist, time, notify.
  Future<DecisionLoopResult> _completePipeline(DecisionTraceDto trace) async {
    final validated = _validator.validateAll(
      trace,
      contractVersion: irisBridgeContractVersion,
    );
    if (!validated.isValid) {
      return DecisionLoopResult(
        traceId: trace.traceId,
        storeHashAfterSave: _store.computeStoreHash(),
        isSuccess: false,
        errors: List<String>.from(validated.errors),
      );
    }
    _store.save(ValidatedTraceResult(
      trace: trace,
      isValid: true,
      errors: const <String>[],
    ));
    if (_persistenceStore != null) {
      await _persistenceStore!.append(TraceRecord.fromTrace(trace));
    }
    _timeContextController?.onTraceCommitted(trace);
    if (_persistenceStore != null && _timeContextController != null) {
      final ctx = _timeContextController!.current;
      await _persistenceStore!.append(TimeContextRecord.fromContext(
        ctx.sessionId.value,
        ctx.currentTime.tick,
        ctx.currentTime.origin,
      ));
    }
    _notifier.notifyAfterSave();
    return DecisionLoopResult(
      traceId: trace.traceId,
      storeHashAfterSave: _store.computeStoreHash(),
      isSuccess: true,
      errors: const <String>[],
    );
  }
}
