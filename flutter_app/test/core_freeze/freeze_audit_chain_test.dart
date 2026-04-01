// Phase 13.6 — Audit chain tests.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core_freeze/freeze_audit_chain.dart';
import 'package:iris_flutter_app/core_freeze/freeze_seal.dart';
import 'package:iris_flutter_app/core_freeze/freeze_seal_engine.dart';

const _chainPath = 'lib/core_freeze/freeze_audit_chain.dart';

void main() {
  group('6.3 — Chain verification success', () {
    test('genesis chain verifies', () {
      expect(verifyFreezeAuditChain(genesisChain), isTrue);
    });

    test('two-seal valid chain verifies', () {
      final first = genesisSeal;
      final second = computeFreezeSeal(
        freezeVersion: '13.5',
        structuralHash: 'b' * 64,
        previousSeal: first.sealHash,
      );
      final chain = FreezeAuditChain([first, second]);
      expect(verifyFreezeAuditChain(chain), isTrue);
    });
  });

  group('6.4 — Chain tampering detection', () {
    test('altered seal hash in middle → false', () {
      final first = genesisSeal;
      final second = computeFreezeSeal(
        freezeVersion: '13.5',
        structuralHash: 'b' * 64,
        previousSeal: first.sealHash,
      );
      final tampered = FreezeSeal(
        freezeVersion: second.freezeVersion,
        structuralHash: second.structuralHash,
        previousSeal: second.previousSeal,
        sealHash: 'x' * 64,
      );
      final chain = FreezeAuditChain([first, tampered]);
      expect(verifyFreezeAuditChain(chain), isFalse);
    });

    test('wrong previousSeal link → false', () {
      final first = genesisSeal;
      final second = computeFreezeSeal(
        freezeVersion: '13.5',
        structuralHash: 'b' * 64,
        previousSeal: first.sealHash,
      );
      final broken = FreezeSeal(
        freezeVersion: second.freezeVersion,
        structuralHash: second.structuralHash,
        previousSeal: 'WRONG',
        sealHash: second.sealHash,
      );
      final chain = FreezeAuditChain([first, broken]);
      expect(verifyFreezeAuditChain(chain), isFalse);
    });

    test('empty chain throws', () {
      expect(() => FreezeAuditChain([]), throwsArgumentError);
    });
  });

  group('6.5 — Genesis correctness', () {
    test('first seal has previousSeal == GENESIS', () {
      expect(genesisSeal.previousSeal, equals(kGenesisFreezeSeal));
    });

    test('genesis chain has exactly one seal', () {
      expect(genesisChain.seals.length, equals(1));
    });

    test('genesis seal uses official structural hash and version', () {
      expect(genesisSeal.structuralHash, equals(kGenesisStructuralHash));
      expect(genesisSeal.freezeVersion, equals(kGenesisFreezeVersion));
    });
  });

  group('FreezeAuditChain', () {
    test('equality is by seal list', () {
      final a = FreezeAuditChain([genesisSeal]);
      final b = FreezeAuditChain([genesisSeal]);
      expect(a, equals(b));
      expect(a.hashCode, equals(b.hashCode));
    });
  });

  group('6.6 — Forbidden runtime (audit chain)', () {
    test('freeze_audit_chain.dart has no DateTime, Random, Timer, File IO, Http, Platform, env, crypto RNG', () {
      final source = File(_chainPath).readAsStringSync();
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
