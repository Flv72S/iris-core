# Phase 11.1.4 — Test Certification

## Comandi ufficiali

```bash
cd flutter_app
flutter pub get
flutter test
```

Per aggiornare i golden (solo in audit controllato):

```bash
flutter test --update-goldens
```

## Gate di superamento

Phase 11.1 è certificata solo se:

1. Tutti i test verdi — `flutter test` exit 0.
2. Nessun golden drift — golden non cambiano senza modifica intenzionale.
3. Zero lint violations — `flutter analyze` senza errori.
4. Explainability gate PASS — test in `test/certification/explainability_gate_test.dart` verdi.

## Struttura test

- `test/_infrastructure/` — Binding, golden config, test app wrapper.
- `test/golden/_infra/` — golden_utils (pump deterministico, expectGolden).
- `test/certification/` — ui_determinism, explainability_gate, safety_visual_gate, navigation_integrity.

## Dipendenze

Nessun test dipende da tempo reale, random, rete, filesystem esterno.
