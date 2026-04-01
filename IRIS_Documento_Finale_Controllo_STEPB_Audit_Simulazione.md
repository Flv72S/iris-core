# IRIS — Documento Finale di Controllo: STEP B + Audit Ostile + Simulazione Early Adopter

> Documento operativo vincolante per la FASE 1 di IRIS.  
> Contiene vincoli congelati, audit ostile e risultati simulazione early adopter.  
> Ogni sezione e citabile e verificabile.

---

## 1. Congelamento STEP B (Esempio precompilato)

| # | Vincolo / Principio | Sezione di Riferimento | Stato | Note aggiuntive |
|---|-------------------|----------------------|-------|----------------|
| 1 | No dark pattern | Principi Etici | ✅ | Notifiche informative, metriche engagement proibite |
| 2 | No spam economy | Principi Etici | ✅ | Incentivi solo su retention e qualita contributi |
| 3 | IRIS = Protocollo di Relazione | USP | ✅ | Thread obbligatori e messaggi con stato |
| 4 | Thread obbligatori nei messaggi | USP | ✅ | |
| 5 | Messaggi con stato e contesto | USP | ✅ | Metadati obbligatori e verificabili |
| 6 | Root identity non eliminabile | Identita | ✅ | Continuita separata da dati personali |
| 7 | Alias e pseudonimi come projection | Identita | ✅ | |
| 8 | Anti-sybil compatibile con UX | Identita | ✅ | Frizione massima definita e verificabile |
| 9 | Community come unita primaria | Community | ✅ | Comunicazione non contestualizzata non primaria |
| 10 | Memoria per-community, consultiva | Community | ✅ | Memoria non prescrittiva o punitiva |
| 11 | Reputazione composita, non trasferibile | Community | ✅ | Nessuna reputazione globale o aggregata |
| 12 | AI opt-in | AI | ✅ | Opt-in esplicito e revocabile |
| 13 | Social Coach opzionale | AI | ✅ | Layer separato, nessuna dipendenza core |
| 14 | Scope MVP rispettato | Scope MVP | ✅ | Freeze scope hard |
| 15 | Allineamento Core Condiviso (Colibri) | Core Condiviso | ✅ | Modifiche core vietate senza eccezioni |

---

## 2. Audit Ostile Reale (Atto 2) — Precompilato

| # | Vincolo / Principio | Tipo di Rischio / Ambiguita | Impatto Potenziale | Suggerimento di Rafforzamento Normativo |
|---|-------------------|-----------------------------|-----------------|----------------------------------------|
| 1 | No dark pattern | Notifiche camuffate da informative per engagement | Dipendenza comportamentale, riduzione fiducia | Vietare metriche di click-through per notifiche; audit trasparente delle finalita |
| 2 | No spam economy | Incentivi indiretti legati al numero di inviti | Crescita artificiale, bassa qualita utenti | Vietare benefici legati a inviti o volume; criteri solo qualitativi e documentati |
| 3 | IRIS = Protocollo di Relazione | Reintroduzione chat lineare per pressione UX | Deriva verso messenger tradizionale | Obbligo di stato e contesto per ogni messaggio valido |
| 4 | Thread obbligatori | Thread auto-generati ma ignorati nel flusso | Struttura solo cosmetica | Thread come unita primaria di navigazione e azione |
| 5 | Messaggi con stato | Stato opzionale o ignorato dai client | Perdita consistenza dei contesti | Validazione obbligatoria di stato e contesto per ogni messaggio |
| 6 | Root identity non eliminabile | Correlazione indebita root/alias | Rischio privacy e retention indebita | Separare continuita relazionale da dati personali; correlazione post-oblio vietata |
| 7 | Alias e pseudonimi come projection | Alias trattati come identita autonome | Elusione responsabilita | Alias sempre derivabile da root identity per audit interno |
| 8 | Anti-sybil compatibile con UX | Frizione non definita o barriere invasive | Trasformazione in piattaforma di compliance | Definire soglia massima di frizione e criteri minimi di affidabilita |
| 9 | Community come unita primaria | DM usati come percorso primario | Perdita memoria condivisa | Comunicazione non contestualizzata non puo essere primaria |
| 10 | Memoria per-community, consultiva | Memoria usata come gating o scoring | Potere automatico implicito | Vietare uso della memoria per abilitare o bloccare azioni |
| 11 | Reputazione composita, non trasferibile | Aggregazioni indirette cross-community | Reputazione globale implicita | Vietare aggregazioni e trasferimenti di segnali tra community |
| 12 | AI opt-in | Opt-in implicito durante onboarding | Violazione fiducia | Consenso esplicito, specifico e revocabile; default disattivo |
| 13 | Social Coach opzionale | Nudges percepiti come prescrittivi | Reiezione UX | Vietare linguaggio prescrittivo; coach disattivabile senza perdita funzioni base |
| 14 | Scope MVP rispettato | Elementi non MVP inseriti "per comodita" | Deriva di dominio e ritardi | Vietare campi o logiche non usate dall'MVP |
| 15 | Allineamento Core Condiviso (Colibri) | Estensioni che alterano semantica core | Incompatibilita cross-modulo | Elenco chiuso di stati/ruoli/transizioni immutabili; ogni deviazione e violazione |

---

## 3. Simulazione Early Adopter (Atto 3) — Esempi concreti

### Archetipi

| Archetipi | Obiettivo principale | Dolore attuale | Necessita risolutiva |
|------------|-------------------|---------------|---------------------|
| Community Builder | Gestire community coese | Chat caotiche, thread persi | Thread ordinati, governance semplice, memoria consultabile |
| Creator multipiattaforma | Coordinare audience frammentata | Follower su canali diversi | Contesto unico per messaggi e relazioni |
| Team informale cross-country | Collaborare in remoto | Chat disperse, perdita contesto | Identita fluida, messaggi con stato, contesto persistente |

### Scenario d'uso Archetipico 1 — Community Builder

- **Step principali**:
  1. Creazione community con ruoli e stati relazionali espliciti.
  2. Messaggi con thread obbligatori e stato esplicito.
  3. Consultazione memoria consultiva per decisioni pregresse.
- **Vincoli STEP B / Audit Ostile applicati**:
  - Thread obbligatori, messaggi con stato e contesto, community primaria.
- **Dolori residui**:
  - ⚠️ Onboarding piu strutturato per definire ruoli e stati.
- **Successi principali**:
  - ✅ Messaggi organizzati e governance chiara.
  - ✅ Memoria consultabile e coerente.

### Scenario d'uso Archetipico 2 — Creator multipiattaforma

- **Step principali**:
  1. Creazione contesto unico per la community principale.
  2. Conversazioni strutturate per tema, no chat infinita.
  3. Gestione alias contestuali per ruoli diversi.
- **Vincoli applicati**:
  - Protocollo di relazione, no chat infinita, alias come projection.
- **Dolori residui**:
  - ⚠️ Frizione nel consolidare audience senza meccaniche di growth.
- **Successi principali**:
  - ✅ Contesto unico e coerente.
  - ✅ Continuita relazionale senza engagement artificiale.

### Scenario d'uso Archetipico 3 — Team informale cross-country

- **Step principali**:
  1. Definizione identita e ruoli di base per contesti di lavoro.
  2. Thread per attivita con stato esplicito.
  3. AI opt-in per supporto contestuale non prescrittivo.
- **Vincoli applicati**:
  - AI opt-in, stato e contesto obbligatori, anti-sybil compatibile con UX.
- **Dolori residui**:
  - ⚠️ Consenso esplicito per AI in ogni contesto.
  - ⚠️ Frizione iniziale nella definizione di ruoli e stati.
- **Successi principali**:
  - ✅ Riduzione rumore e duplicazioni.
  - ✅ Supporto AI trasparente e limitato.

---

## 4. Sintesi e Referenze

- **Dolori principali accettabili**:
  - Assenza di ranking o gamification.
  - Limitazioni alla comunicazione non contestualizzata.
  - Nessuna chat infinita come default.
- **Dolori da mitigare senza violare STEP B**:
  - Onboarding strutturato per ruoli e stati.
  - Consenso AI per contesto e revocabilita.
  - Consolidamento audience senza meccaniche di growth.
- **Successi principali confermati**:
  - Thread obbligatori e messaggi con stato.
  - Memoria consultiva per community.
  - Coerenza con principi etici e trasparenza AI.
- **Collegamento STEP B → Audit Ostile → Early Adopter**:
  - La tabella dell'Atto 2 e l'indice numerato di vincoli e rischi.
  - Ogni scenario di Atto 3 richiama i vincoli applicati per tracciabilita.

---

**Nota finale:** Questo documento e fonte unica di verita per la FASE 1. Ogni modifica futura deve essere documentata e versionata.
