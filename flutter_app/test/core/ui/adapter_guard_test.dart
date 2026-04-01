import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/ui/ui_projection_adapter.dart';

void main() {
  group('UIProjectionAdapter', () {
    test('toViewModel is pure', () {
      final adapter = _CounterAdapter();
      final vm1 = adapter.toViewModel(_CounterState(5));
      final vm2 = adapter.toViewModel(_CounterState(5));
      expect(vm1.displayCount, vm2.displayCount);
      expect(vm1.displayCount, '5');
    });
  });
}

class _CounterState {
  _CounterState(this.count);
  final int count;
}

class _ViewModel {
  _ViewModel(this.displayCount);
  final String displayCount;
}

class _CounterAdapter extends UIProjectionAdapter<_CounterState, _ViewModel> {
  @override
  _ViewModel toViewModel(_CounterState state) {
    return _ViewModel(state.count.toString());
  }
}
