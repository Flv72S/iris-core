# IRIS 12.x.F — Action Bridge Final Freeze

**Documento:** Freeze finale architetturale  
**Fase:** 12.x.F — Action Bridge Final Freeze  
**Stato:** IRIS 12.x **congelato e definitivo**  
**Natura:** Confine dichiarativo completo · Nessuna esecuzione · Nessuna delivery

---

## Stato finale

L’**Action Bridge** (12.0–12.4) è **definitivo e congelato**. Comprende:

- **12.0** — Phase Opening: Intent dichiarativi, engine, kill-switch, nessuna esecuzione
- **12.1** — Action Intent Typing & Taxonomy: tassonomia stabile (`notify`, `request`, `confirm`, …)
- **12.2** — Messaging Contract: contratti da intent, engine contratti, nessun invio
- **12.3** — Capability Declaration & Compatibility: capability e compatibility snapshot descrittivi
- **12.4** — Action Plan Snapshot: aggregazione dichiarativa (intents, contracts, compatibility)

L’Action Bridge **MUST** restare un confine **solo dichiarativo**. Ogni esecuzione, invio o delivery **MUST** avvenire **solo** in sistemi esterni.

---

## Invarianti

1. **Decision ≠ Action Intent ≠ Execution** — IRIS 12.x non esegue.
2. **Solo input da 11.x** — Action Bridge consuma `IrisDecisionSelectionSnapshot`; Messaging Contract consuma `IrisActionIntentSnapshot`.
3. **Output dichiarativo** — Intent, contratti, compatibility e Action Plan sono dati read-only; nessun comando.
4. **Nessun side-effect** — Nessuna mutazione, I/O, chiamata a delivery/adapter, logging operativo.
5. **Snapshot frozen** — Tutti gli snapshot esposti (intent, contract, compatibility, action plan) **MUST** essere immutabili (frozen).
6. **Nessuna dipendenza da adapter o delivery** — Il layer 12.x **MUST NOT** importare o dipendere da IrisDeliveryEngine, adapter di messaging, o governance per esecuzione.

---

## Ambito escluso

- **Execution** — Nessuna esecuzione di azioni, nessun trigger, nessun comando.
- **Delivery** — Nessun invio, nessuna chiamata a delivery engine, nessun canale attivato.
- **Adapter** — Nessuna conoscenza di adapter concreti, nessun binding a sistemi di invio.
- **Selezione operativa** — Nessuna “scelta” di chi esegue; solo dichiarazione e compatibilità descrittiva.
- **Policy operative** — Nessuna retry, priority, schedule, workflow nel bridge.

---

## Relazione con Opzione C

**Opzione C** è il percorso architetturale in cui:

- **IRIS** si ferma al confine **Decision + Action Intent + Messaging Contract + Compatibility**.
- **Esecuzione, delivery e adapter** restano **fuori** da IRIS, in sistemi esterni (Messaging System, Execution Engine).

Il Final Freeze 12.x.F **sancisce** che l’Action Bridge rispetta Opzione C: IRIS fornisce **cosa** sarebbe coerente e **cosa** è compatibile; **come** e **quando** eseguire spetta esclusivamente ai sistemi esterni.

---

## Anti-pattern (MUST NOT)

- **smartAction**, **autoExecuteIntent**, **recommendedAction**
- **actionPolicy**, **workflowEngine**, **retryIntent**, **scheduledIntent**
- **adaptiveAction**, **closedLoopAction**
- **Import** da delivery engine, feedback engine, governance (per scopi di esecuzione), adapter di messaging
- **Proprietà** `execute`, `send`, `trigger`, `command`, `deliver`, `channelId`, `adapterId` nei tipi 12.x

---

## Dichiarazione notarile

> **IRIS 12.x è un confine dichiarativo completo.**  
> **L’esecuzione appartiene esclusivamente ai sistemi esterni.**

---

## Riferimenti

- Phase Opening: `docs/architecture/iris-12.0-action-bridge-phase-opening.md`
- Messaging Contract (11.C): `docs/architecture/iris-messaging-contract.md`
- Futura Fase 13.x: integrazione con Execution/Delivery (esterni)
