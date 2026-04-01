# Phase 7.F — Boundary Attestation (Formal Phase Isolation Certification)

## Perché la Boundary Attestation è necessaria

La Phase 7 (Execution Runtime) è certificata per determinismo, guardrail, kill-switch, rollback, audit e replay. Manca l’ultima prova formale:

> **Dimostrare che IRIS non entra in Phase 8** durante l’esecuzione della Phase 7.

Se durante Phase 7 venissero toccati Signal Layer, User Preferences o Learning, il sistema non sarebbe più isolato e la certificazione sarebbe invalida. La Boundary Attestation verifica che:

- **Nessuna scrittura** avviene nel Signal Layer  
- **Nessuna mutazione** avviene nelle User Preferences  
- **Nessun componente di Learning** viene attivato  

Se una sola di queste condizioni è violata → **la Phase 7 NON è certificabile**.

---

## Relazione con Phase 8

- **Phase 8** (Feedback Loop) introduce segnali, preferenze e apprendimento.  
- **Phase 7** deve limitarsi a: leggere segnali già derivati, eseguire ActionIntent deterministici, scrivere Execution Audit Log append-only.  
- La Boundary Attestation certifica l’**isolamento**: durante Phase 7 non si producono nuovi segnali, non si modificano preferenze, non si attiva apprendimento.  
- Solo con **Phase 7 Fully Certified** (inclusa boundary) il sistema può passare a Phase 8 senza violare determinismo, controllo o isolamento cognitivo.

---

## Come eseguire il test

```bash
npx vitest run tests/phase-7-boundary
```

Per ottenere il report formale da codice:

```ts
import { produceBoundaryReport } from './boundary-report';

const report = produceBoundaryReport();
console.log('Phase 7 Fully Certified:', report.phase7FullyCertified);
```

---

## Significato di Phase 7 Fully Certified

**phase7FullyCertified** è `true` solo se:

- **signalLayerIsolation** — nessuna scrittura rilevata nel Signal Layer  
- **preferenceImmutability** — preferenze immutate (stesso snapshot prima/dopo)  
- **learningInactive** — nessuna attivazione di Learning  

Se tutti e tre sono `true`, si può affermare formalmente:

> **IRIS Phase 7 è completamente certificata.**  
> Il sistema può entrare in Phase 8 — Feedback Loop — senza violare determinismo, controllo o isolamento cognitivo.

---

## Distinzione dalle altre suite

- **tests/phase-7-tests/** — Execution Certification (determinismo, guardrail, kill-switch, audit, replay, golden).  
- **tests/phase-7-boundary/** — Phase Isolation Certification (nessuna incursione in Signal Layer, Preferences, Learning).  

Le due certificazioni sono complementari e entrambe necessarie per la Phase 7 Fully Certified.
