# ADR-002 — Canonical Secure Distributed Runtime Contract

## Status
Status: Accepted
Date: 2026-03-26

## Context
IRIS e' un sistema distribuito sicuro. Il suo valore operativo dipende da quattro proprieta che devono essere vere simultaneamente:

- determinismo
- sicurezza
- convergenza
- auditabilita'

In un sistema distribuito, un runtime non deterministico rende non affidabile l'intero sistema. Non significa solo che i test possono fallire: significa che l'osservazione del sistema non puo' essere trattata come verita' verificabile, e quindi audit, incident response e analisi post-mortem perdono significato.

Dopo l'adozione della stabilizzazione della runtime execution pipeline (definita in ADR-001), resta necessaria una formalizzazione atemporale del contratto di esecuzione: una specifica dei vincoli non negoziabili che governano qualsiasi runtime path canonico di IRIS.

## Decision
IRIS adotta un modello di runtime deterministico, phase-based, fail-fast. Lo stato del sistema e' sempre esplicitamente valido o esplicitamente invalido. Non esistono stati parziali tollerati come se fossero validi.

Questo modello e' un contratto architetturale: vale indipendentemente dalle componenti specifiche abilitate, dalle configurazioni di ambiente e dalle condizioni di rete.

## 5. Core Principles

### 5.1 Deterministic Execution
- stesso input globale (stato iniziale + input di rete + input amministrativi) deve produrre lo stesso comportamento osservabile
- l'ordine delle operazioni rilevanti deve essere definito secondo regole deterministiche
- le differenze tra run devono essere ricondotte a varianza esplicita e tracciabile, non a ambiguita' del runtime

### 5.2 No Partial State
- uno stato incompleto e' invalido per definizione
- non esistono "half-started systems" che espongono funzionalita operative insieme a metriche o invariants non coerenti
- qualunque osservazione del sistema deve poter essere giustificata rispetto al contratto di validita' dello stato

### 5.3 Fail-Fast Semantics
- gli errori devono bloccare la progressione verso fasi successive
- nessun fallback implicito deve mascherare l'origine del fallimento
- l'avvio non puo' convergere verso uno stato operativo quando una componente critica e' in errore

### 5.4 Phase-Based Lifecycle
- l'esecuzione e' suddivisa in fasi atomiche con confini chiari
- ogni fase ha criteri di successo che rendono lo stato successivo valido
- il confine di fase e' parte del contratto: serve per isolamento di failure-domain, audit e interpretazione corretta delle osservazioni

### 5.5 Observability as Source of Truth
- lo stato osservabile e le metriche sono vincolanti per la semantica del sistema
- invariants e controlli di coerenza devono trattare l'osservabilita come una componente del contratto, non come un effetto collaterale
- metriche e snapshot devono essere costruiti in modo coerente con la validita' dello stato

## 6. Decision Boundaries
Nel sistema IRIS non e' consentito:

- accettare partial state come operativo
- introdurre implicit fallback che mascherano errori e rendono indistinguibile il caso "success" dal caso "degradato"
- eseguire operazioni in ordine non definito quando l'ordine influenza il comportamento osservabile
- considerare l'osservabilita come opzionale o "best effort" rispetto agli invariants richiesti dal modello
- consentire cammini runtime alternativi che violano l'esecuzione phase-based deterministica

## 7. Scope of Impact
Il modello si applica:

- alla runtime execution path canonica che avvia, collega e rende operativo il sistema distribuito
- alle decisioni di gestione errori e transizioni tra stati
- alla produzione e validazione di snapshot e metriche usate per audit e certificazione

Il modello non pretende di:

- descrivere la logica applicativa di dominio
- imporre quale meccanismo di consenso o sincronizzazione venga usato a livello applicativo
- specificare dettagli implementativi di componenti singole

## 8. Consequences

### Positive
- affidabilita' operativa: le osservazioni corrispondono a uno stato valido o a un errore esplicito
- auditabilita' reale: incident response e analisi post-mortem possono ripercorrere la fase di invalidazione dello stato
- sicurezza migliorata: l'assenza di stati parziali riduce superficie di attacco per comportamenti imprevisti e incoerenti
- base robusta per convergenza multi-node: determinismo e validita' dello stato rendono la convergenza verificabile

### Negative / Trade-offs
- rigidita': l'ambiguita' operativa viene rimossa, anche se riduce flessibilita' durante lo sviluppo
- complessita': la phase separation e fail-fast richiedono disciplina nella progettazione dei confini
- configurazione piu stringente: gli input devono rispettare requisiti del contratto per evitare invalidazione dell'avvio

## 9. Risk Model
Il modello elimina o riduce in modo significativo rischi tipici:

- inconsistenza: tra componenti e tra osservazione e stato interno
- non determinismo: variazioni di comportamento tra run che impediscono validazione e audit
- failure invisibili: errori che non emergono chiaramente come transizioni a stato invalido
- convergenza non verificabile: mancanza di giustificazioni deterministiche per gli esiti di sincronizzazione

## 10. Capability Unlock
Definendo un contratto di esecuzione sicuro e deterministico, IRIS abilita:

- multi-node runtime reale: convergenza e failure semantics ripetibili e interpretabili
- SLA e reliability layer: misure per fase e invariants come prerequisito di affidabilita'
- deployment orchestrato: boot/stop prevedibili, rollback senza stati ambigui, riduzione del rischio operativo

## 11. Relation with ADR-001
Questo ADR (ADR-002) stabilisce il contratto astratto e non negoziabile: il "che cosa" deve valere per un runtime sicuro e deterministico.

ADR-001 descrive la decisione tecnica con cui il sistema realizza operativamente questo contratto tramite stabilizzazione phase-based, failure-aware semantics e osservabilita vincolante.

## 12. Decision Summary
IRIS adotta un modello canonico di runtime deterministico, phase-based e fail-fast.
Lo stato del sistema e' sempre esplicitamente valido o esplicitamente invalido; non esistono stati parziali tollerati come operativi.
Le fasi definiscono confini di validita' e isolamento failure-domain.
L'osservabilita e gli invariants sono parte del contratto: senza coerenza non esiste validita' di runtime.

