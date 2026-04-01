// M7 — Abstraction for nested composition. DEC and CDC are used via wrappers; no modification to L or M1.

import 'dart:typed_data';

import 'package:iris_flutter_app/flow/application/contract/deterministic_execution_contract.dart';
import 'package:iris_flutter_app/flow/composition/composite_deterministic_contract.dart';

/// Unit that can participate in nested composition. Exposes deterministic hash and canonical bytes only.
abstract class ComposableDeterministicUnit {
  int get deterministicHash;
  Uint8List get canonicalBytes;
}

/// Wraps [DeterministicExecutionContract] as [ComposableDeterministicUnit] without modifying DEC.
class DecUnit implements ComposableDeterministicUnit {
  DecUnit(this.dec);
  final DeterministicExecutionContract dec;
  @override
  int get deterministicHash => dec.deterministicHash;
  @override
  Uint8List get canonicalBytes => dec.canonicalBytes;
}

/// Wraps [CompositeDeterministicContract] as [ComposableDeterministicUnit] without modifying CDC.
class CdcUnit implements ComposableDeterministicUnit {
  CdcUnit(this.cdc);
  final CompositeDeterministicContract cdc;
  @override
  int get deterministicHash => cdc.compositeDeterministicHash;
  @override
  Uint8List get canonicalBytes => cdc.canonicalCompositeBytes;
}
