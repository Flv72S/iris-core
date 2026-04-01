# Governance Autonomous Watcher — Self-Monitoring Governance Engine

**Fase 8 — Step 8L**

---

## 1. Introduzione

Il **Governance Autonomous Watcher** è il modulo di auto-sorveglianza della governance IRIS. Opera in sola lettura e analisi: monitora ledger, policy enforcement, snapshot governance, certificati e decisioni runtime per individuare violazioni di policy, drift di governance, incoerenze del ledger ed eventi sospetti. Quando rileva anomalie produce **GovernanceAlert** senza modificare lo stato del sistema, preparando l’infrastruttura per la Fase 9 — Autonomous Governance Systems.

---

## 2. Architettura

Il watcher risiede in `src/governance/watcher/` con la seguente struttura:

- **types/** — `GovernanceAlert` e creazione alert (alert_id, alert_hash, severity, source).
- **detection/** — quattro detector deterministici:
  - Policy Violation Detector
  - Governance Drift Detector
  - Ledger Integrity Detector
  - Suspicious Event Detector
- **watcher/** — `runGovernanceCheck()` che orchestra i detector e restituisce l’elenco di alert.

Il componente è **stateless** e **deterministico**: nessun DB, rete, I/O asincrono o scheduler; riutilizza ≥90% dell’infrastruttura esistente (GovernanceLedger, GovernanceProof, CertificationEngine, PolicyEngine, TimeMachine) senza modificarli.

---

## 3. Governance Self-Monitoring

Il Watcher realizza un **Self-Monitoring Governance Engine**: analizza in modo continuo e deterministico:

- **Governance ledger** — integrità della catena (hash chain, ordine temporale).
- **Policy enforcement** — coerenza tra decisioni runtime e feature bloccate/consentite.
- **Snapshot governance** — allineamento allo snapshot certificato (hash).
- **Certificati** — confronto tra hash snapshot corrente e certified snapshot hash.
- **Decisioni runtime** — correlazione con policy e timeline eventi.

L’obiettivo è individuare anomalie in tempo reale (nel ciclo di check) senza alterare lo stato di IRIS.

---

## 4. Alert Model

Ogni **GovernanceAlert** include:

- `alert_id` — SHA256(type + reference_hash + timestamp).
- `type` — POLICY_VIOLATION | GOVERNANCE_DRIFT | LEDGER_INTEGRITY_FAILURE | SUSPICIOUS_ACTIVITY.
- `severity` — LOW | MEDIUM | HIGH | CRITICAL.
- `source` — "GovernanceWatcher".
- `description` — messaggio testuale.
- `reference_event_id`, `reference_hash` (opzionali).
- `timestamp` — istante di generazione.
- `alert_hash` — SHA256(JSON.stringify(alert)) per ledger logging e verifica.

Gli alert sono immutabili e verificabili; possono essere registrati sul ledger o in log di governance per audit.

---

## 5. Integrazione con Ledger

Il Watcher non scrive sul ledger; può essere usato da componenti esterni che:

- invocano `runGovernanceCheck()` con snapshot, enforcement, decisione, certified hash e (opzionalmente) ledger ed eventi;
- ricevono l’elenco di `GovernanceAlert`;
- registrano gli alert (es. tramite `alert_hash`) in log o in strutture di audit collegate al Governance Ledger.

L’integrità del ledger è essa stessa oggetto di controllo: il Ledger Integrity Detector usa `verifyLedger()` (Step 8G) e segnala LEDGER_INTEGRITY_FAILURE in caso di rottura della catena o violazione dell’ordine dei timestamp.

---

## 6. Integrazione con Certification

Il Governance Drift Detector confronta l’hash dello snapshot corrente (calcolato con `hashObjectDeterministic()` di Step 8E) con il `certifiedSnapshotHash`. In caso di disallineamento viene emesso un alert GOVERNANCE_DRIFT (CRITICAL). In questo modo il Watcher tiene traccia della coerenza tra stato governance osservato e stato certificato, senza sostituire il Certification Engine.

---

## 7. Benefici per aziende

- **Controllo automatico** — riduzione del rischio di violazioni policy e drift non rilevati.
- **Audit verificabile** — alert con `alert_hash` e riferimenti a eventi/hash per tracciabilità.
- **Nessun impatto operativo** — sola lettura e analisi, nessuna modifica allo stato.
- **Riuso dell’infrastruttura** — massimo riutilizzo di ledger, proof, certification e policy engine.

---

## 8. Benefici per cloud

- **Governance osservabile** — il Self-Monitoring Governance Engine può essere esposto come fonte di eventi per dashboard e SIEM.
- **Compliance** — segnalazione tempestiva di incoerenze e sospette attività ravvicinate.
- **Determinismo** — stesso input → stesso set di alert, favorendo replay e test in ambienti cloud.

---

## 9. Benefici per PA

- **Trasparenza** — alert documentati e riferibili a snapshot/ledger/eventi.
- **Conformità normativa** — rilevamento di violazioni di policy e integrità del registro governance.
- **Preparazione a Fase 9** — base per sistemi di governance autonoma e escalation controllata.

---

## 10. Posizionamento strategico

Il Governance Autonomous Watcher si posiziona come **Self-Monitoring Governance Engine** tra la governance operativa (Step 7A–8K) e i futuri **Autonomous Governance Systems** (Fase 9). Fornisce il livello di osservabilità e allarme necessario per prendere decisioni autonome in modo sicuro e verificabile, senza introdurre side-effect sullo stato del sistema.

---

*Documento allineato a IRIS Fase 8 — Step 8L.*
