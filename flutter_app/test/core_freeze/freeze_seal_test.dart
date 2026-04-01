// Phase 13.6 — Freeze Seal tests.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core_freeze/freeze_seal.dart';
import 'package:iris_flutter_app/core_freeze/freeze_seal_engine.dart';

const _sealPath = 'lib/core_freeze/freeze_seal.dart';
const _enginePath = 'lib/core_freeze/freeze_seal_engine.dart';

void main() {
  group('6.1 — Seal determinism', () {
    test('same inputs produce same sealHash', () {
      const v = '13.4';
      const h = '7df6eba3c96039113db3fb609e2524b4ccd14fec5b29937bad66618de1fe1fff';
      const p = 'GENESIS';
      final a = computeFreezeSeal(freezeVersion: v, structuralHash: h, previousSeal: p);
      final b = computeFreezeSeal(freezeVersion: v, structuralHash: h, previousSeal: p);
      expect(a.sealHash, equals(b.sealHash));
      expect(a, equals(b));
    });
  });

  group('6.2 — Seal mutation detection', () {
    test('changing version changes sealHash', () {
      const h = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const p = 'GENESIS';
      final s1 = computeFreezeSeal(freezeVersion: '13.4', structuralHash: h, previousSeal: p);
      final s2 = computeFreezeSeal(freezeVersion: '13.5', structuralHash: h, previousSeal: p);
      expect(s1.sealHash, isNot(equals(s2.sealHash)));
    });

    test('changing structural hash changes sealHash', () {
      const v = '13.4';
      const p = 'GENESIS';
      final s1 = computeFreezeSeal(
        freezeVersion: v,
        structuralHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        previousSeal: p,
      );
      final s2 = computeFreezeSeal(
        freezeVersion: v,
        structuralHash: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        previousSeal: p,
      );
      expect(s1.sealHash, isNot(equals(s2.sealHash)));
    });

    test('changing previous seal changes sealHash', () {
      const v = '13.4';
      const h = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      final s1 = computeFreezeSeal(freezeVersion: v, structuralHash: h, previousSeal: 'GENESIS');
      final s2 = computeFreezeSeal(freezeVersion: v, structuralHash: h, previousSeal: 'OTHER');
      expect(s1.sealHash, isNot(equals(s2.sealHash)));
    });
  });

  group('FreezeSeal DTO', () {
    test('toJson has fixed key order', () {
      final seal = computeFreezeSeal(
        freezeVersion: '1',
        structuralHash: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        previousSeal: 'GENESIS',
      );
      final json = seal.toJson();
      final keys = json.keys.toList();
      expect(
        keys,
        equals(['freeze_version', 'previous_seal', 'seal_hash', 'structural_hash']),
      );
    });

    test('fromJson round-trip', () {
      final seal = computeFreezeSeal(
        freezeVersion: '13.4',
        structuralHash: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
        previousSeal: 'GENESIS',
      );
      final json = Map<Object?, Object?>.from(seal.toJson());
      final restored = FreezeSeal.fromJson(json);
      expect(restored, equals(seal));
    });

    test('fromJson throws on missing required fields', () {
      expect(
        () => FreezeSeal.fromJson({}),
        throwsArgumentError,
      );
    });
  });

  group('6.6 — Forbidden runtime (seal)', () {
    test('freeze_seal.dart has no DateTime, Random, Timer, Stopwatch, File, Http, Platform, env, crypto RNG', () {
      final source = File(_sealPath).readAsStringSync();
      expect(source, isNot(contains('DateTime')));
      expect(source, isNot(contains('Random')));
      expect(source, isNot(contains('Timer')));
      expect(source, isNot(contains('Stopwatch')));
      expect(source, isNot(contains('File(')));
      expect(source, isNot(contains('HttpClient')));
      expect(source, isNot(contains('Platform')));
      expect(source, isNot(contains('environment')));
      expect(source, isNot(contains('SecureRandom')));
    });
  });

  group('6.6 — Forbidden runtime (engine)', () {
    test('freeze_seal_engine.dart has only SHA-256, no DateTime, Random, IO, Http, etc.', () {
      final source = File(_enginePath).readAsStringSync();
      expect(source, isNot(contains('DateTime')));
      expect(source, isNot(contains('Random')));
      expect(source, isNot(contains('Timer')));
      expect(source, isNot(contains('Stopwatch')));
      expect(source, isNot(contains('File(')));
      expect(source, isNot(contains('HttpClient')));
      expect(source, isNot(contains('Platform')));
      expect(source, isNot(contains('environment')));
      expect(source, isNot(contains('SecureRandom')));
    });
  });
}
