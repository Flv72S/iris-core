# IRIS 10.0 — Phase Opening
## Governance & Control Plane (Non-Decisionale)

**Documento:** Phase Opening  
**Fase:** IRIS 10.0  
**Nome:** Governance & Control Plane  
**Natura:** Fondazionale, VINCOLANTE  
**Prerequisiti:** IRIS 9.3.F (prodotto congelato)

---

## §1 — Stato del documento

- Il presente documento è **VINCOLANTE** — definisce l’apertura della fase IRIS 10.0 e **MUST** essere rispettato da ogni estensione del Governance & Control Plane
- **IRIS 10.0 è in Phase Opening** — si introduce **solo** la fondazione (skeleton, contratti, documento); **MUST NOT** introdurre funzionalità operativa, decisioni, delivery o feedback in questo microstep
- **Ogni estensione operativa richiede microstep separati** — es. 10.1 Delivery, 10.2 Feedback **MUST** essere trattati in prompt e deliverable distinti

---

## §2 — Motivazione della fase 10.0

IRIS 9.3.F ha chiuso il prodotto come:

- non decisionale
- side-effect free
- senza delivery
- senza feedback
- senza governance runtime

La fase **IRIS 10.0** apre **una nuova responsabilità**:

- **Governare** ciò che esiste (9.x e dipendenze), **senza modificarne la semantica**
- Consentire **configurazione runtime** dei componenti IRIS (9.x)
- Centralizzare **kill-switch**, abilitazioni e parametri operativi
- Rendere IRIS **auditabile**, **ispezionabile** e **controllabile**

Governance **MUST NOT** diventare decisione, delivery, feedback o modifica dei layer congelati.

---

## §3 — Definizione di Governance vs Decision

| Governance (consentito) | Decision (vietato) |
|------------------------|--------------------|
| Abilitare / disabilitare componenti | Scegliere interpretazioni, canali, contenuti |
| Osservare stato (read-only) | Applicare ranking, priority, weight |
| Tracciare configurazione e cambi | Ottimizzare, adattare, “migliore” |
| Registry di stato, audit record | Policy decisionale, “sistema sceglie” |
| Versioning di configurazione | Feedback loop, apprendimento |

**Governance = abilitare/disabilitare, osservare, tracciare.**  
**Governance ≠ decidere, scegliere, ottimizzare.**

---

## §4 — Ambito consentito

IRIS 10.0 **MAY** (in questa fase o in microstep successivi, nei limiti del presente documento):

- Definire un **Control Model dichiarativo** — configurazione runtime, componenti, abilitazioni
- Introdurre **runtime configuration**, **registry di stato** dei componenti, **versioning** di configurazione
- Centralizzare i **kill-switch** esistenti (semantic, interpretation, orchestration, messaging, rendering) in un unico piano di controllo
- Produrre **audit record** — cosa è stato abilitato/disabilitato, quando, con quale configurazione
- Esporre **stato osservabile** (read-only) — **MUST NOT** mutare stato di IRIS 9.x o del Semantic Engine

---

## §5 — Ambito escluso

È **VIETATO** in IRIS 10.0 (e **MUST NOT** essere introdotto in nome della Governance):

- Prendere **decisioni applicative**
- Scegliere interpretazioni, orchestrazioni, canali o contenuti
- Attivare **invii**, **dispatch**, **retry**, **scheduling**
- Modificare **ranking**, **priority**, **weight**
- Introdurre **feedback loop**
- Introdurre **apprendimento** o **adattamento**
- Scrivere su **Semantic Engine** o **Fase 7**
- Introdurre **UX**, **rendering** o **copy**

---

## §6 — Relazione con IRIS 9.3.F

- **IRIS 9.3.F resta congelato** — nessuna modifica a semantic-layer, interpretation, orchestration, messaging, rendering
- **10.0 è sovrastruttura** — governa abilitazioni e configurazione; **MUST NOT** alterare semantica o comportamento dei layer 9.x
- **Kill-switch** — il Control Plane **MAY** fornire un registry centralizzato che i layer 9.x già supportano; **MUST NOT** introdurre nuovi kill-switch nella logica 9.x, solo **aggregazione** e **osservabilità** lato 10.0

---

## §7 — Anti-pattern vietati

È **VIETATO** introdurre o suggerire in documentazione o codice IRIS 10.0:

- **“Governance intelligente”** — **MUST NOT** attribuire logica decisionale alla governance
- **“Configurazione ottimale”** — **MUST NOT** prescrivere “ottimo” o “migliore” configurazione
- **“Sistema sceglie”** — **MUST NOT** presentare la governance come scelta del sistema
- **“Decision policy”** — **MUST NOT** introdurre policy che decidano contenuti o canali
- **“Auto-tuning”** — **MUST NOT** introdurre adattamento automatico in questo piano
- **“Adaptive configuration”** — **MUST NOT** introdurre configurazione adattiva in 10.0

---

## §8 — Dichiarazione di apertura fase

**IRIS 10.0 apre la fase di Governance & Control Plane.**

- Nessuna funzionalità operativa è consentita in questo microstep (Phase Opening)
- Solo documento architetturale, skeleton codice e test di conformità
- Ogni estensione (10.1 Delivery, 10.2 Feedback, registry operativo) **MUST** essere richiesta con microstep separati

**VINCOLANTE. APERTURA FASE. NESSUN COMPORTAMENTO OPERATIVO.**

---

**Fine documento — IRIS 10.0 Phase Opening.**
