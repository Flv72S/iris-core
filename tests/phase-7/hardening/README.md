# Phase 7.V+ — Certification Hardening

## Perché Phase 7.V non era sufficiente

La Phase 7.V ha costruito un’**infrastruttura di test funzionante**: fixtures, harness, replay, determinism checker, runner. Non era però **formalmente certificabile** secondo gli standard IRIS Phase 13:

- **Tempo:** uso di `Date.now()` o timestamp non controllati rendeva i replay non perfettamente riproducibili.
- **Determinismo:** il confronto era superficiale (status/audit length); mancava un confronto strutturale profondo e un hash stabile dell’audit.
- **Robustezza:** non c’erano scenari di **failure injection** (crash executor, kill-switch durante esecuzione, audit corrotto) per certificare il comportamento in presenza di guasti.
- **Confini di fase:** non c’era enforcement esplicito che durante Phase 7 non vengano toccati Signal Layer, User Preferences o Learning (Phase 8).

## Cosa aggiunge la Phase 7.V+

1. **Deterministic Time Authority**  
   `time/deterministic-time-provider.ts` e `time/frozen-clock.ts`: un’unica fonte temporale replayabile, congelabile e con seed deterministico. Nessun accesso a `Date.now()` reale nei test.

2. **Strong Determinism Verification**  
   - `determinism/deep-structural-compare.ts`: confronto ricorsivo di execution result, audit snapshot e metadata.  
   - `determinism/audit-hash.ts`: hash stabile per audit; stesso input → stesso hash; consistenza tra replay.  
   - `determinism/side-effect-detector.ts`: verifica assenza di scritture globali, mutazioni non audit-loggate, accessi IO non previsti.

3. **Controlled Failure Injection**  
   - `executor-crash.ts`: eccezione runtime simulata; verifica rollback logico e audit coerente.  
   - `guardrail-race.ts`: superamento simultaneo dei limiti; verifica blocco deterministico.  
   - `kill-switch-during-execution.ts`: attivazione kill-switch a metà esecuzione; verifica stop immediato e audit append-only.  
   - `corrupted-audit-replay.ts`: replay con audit modificato; verifica rilevazione mismatch (hash/structural compare).

4. **Phase Boundary Enforcement**  
   - `signal-layer-write-detector.ts`: nessuna scrittura su Signal Layer.  
   - `preference-mutation-detector.ts`: nessuna mutazione di User Preferences al di fuori del flusso di Resolution.  
   - `learning-activation-detector.ts`: nessuna attivazione di Learning.  
   Se uno di questi triggera durante i test Phase 7, il test fallisce.

## Relazione con Phase 13 Determinism Certification

Phase 13 richiede determinismo forte, replay verificabili e assenza di side-effect non controllati. La hardening 7.V+ fornisce:

- **Tempo deterministico** e **audit hash** per replay verificabili.  
- **Deep structural compare** per confronto bit-a-bit degli output.  
- **Side-effect detector** e **phase-boundary detector** per garantire che l’esecuzione resti entro i confini Phase 7.

## Hardening Suite

Il file **hardening-suite.ts** esegue tutte le verifiche e produce:

```ts
type HardeningReport = {
  deterministic: boolean
  failuresHandled: boolean
  boundariesRespected: boolean
  readyForCertification: boolean
  details?: { ... }
}
```

**readyForCertification** è `true` solo se:

- **deterministic** — determinism check (deep compare + audit hash) e replay consistency passano.  
- **failuresHandled** — kill-switch durante esecuzione e corrupted-audit replay sono gestiti correttamente.  
- **boundariesRespected** — nessuna violazione di signal-layer, preference o learning.

## Come eseguire la hardening suite

Da codice:

```ts
import { runHardeningSuite } from './hardening/hardening-suite';

const report = runHardeningSuite();
console.log('Ready for certification:', report.readyForCertification);
```

Da test (vitest):

```ts
import { runHardeningSuite } from '../hardening/hardening-suite';

it('hardening suite passes', () => {
  const report = runHardeningSuite();
  expect(report.deterministic).toBe(true);
  expect(report.failuresHandled).toBe(true);
  expect(report.boundariesRespected).toBe(true);
  expect(report.readyForCertification).toBe(true);
});
```

## Regole assolute

- **Nessuna modifica** all’Execution Runtime.  
- **Nessuna logica LLM.**  
- **Nessuna anticipazione** di Phase 8.  
- **Nessuna disabilitazione** dei test esistenti.

Questa fase **rafforza** l’infrastruttura, non la altera.
