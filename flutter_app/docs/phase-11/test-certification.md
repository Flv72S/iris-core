# Phase 11.1.4 — Test Certification

## Comandi ufficiali

```bash
flutter pub get
flutter test
```

Per aggiornare i golden (solo in contesto di audit controllato):

```bash
flutter test --update-goldens
```

## Gate di superamento

La Phase 11.1 è **certificata** solo se:

1. **Tutti i test verdi** — `flutter test` esce con codice 0.
2. **Nessun golden drift** — i golden non cambiano senza modifica intenzionale; in caso di modifica, eseguire `flutter test --update-goldens` e verificare il diff.
3. **Zero lint violations** — `flutter analyze` senza errori né critical warnings.
4. **Explainability gate PASS** — i test in `test/certification/explainability_gate_test.dart` passano (titolo e accesso explainability verificati).

## Struttura test

- `test/_infrastructure/` — Binding deterministico, config golden, wrapper app.
- `test/golden/_infra/` — Golden utils (pump deterministico, expectGolden).
- `test/certification/` — UI determinism, explainability presence, safety visual, navigation integrity.

## Dipendenze

Nessun test dipende da: tempo reale, random, rete, filesystem esterno. Esecuzione riproducibile su macchina pulita.
