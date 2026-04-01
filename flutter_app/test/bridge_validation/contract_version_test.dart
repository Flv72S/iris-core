import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/contracts/bridge_contract.dart';
import 'package:iris_flutter_app/bridge/validation/trace_validator.dart';

void main() {
  test('1.0.0 compatible', () {
    expect(TraceValidator().validateContractVersion(irisBridgeContractVersion), isEmpty);
  });
  test('different version error', () {
    final e = TraceValidator().validateContractVersion('2.0.0');
    expect(e, isNotEmpty);
    expect(e.single, contains('1.0.0'));
  });
  test('null version error', () {
    expect(TraceValidator().validateContractVersion(null), isNotEmpty);
  });
}
