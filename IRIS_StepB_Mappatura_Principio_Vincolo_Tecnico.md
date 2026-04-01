# IRIS — STEP B: Mappatura Principio → Vincolo Tecnico
---

## 1. Principi Etici → Vincoli Tecnici
### 1.1 No dark pattern
- **Principio**: nessuna manipolazione dell'attenzione.
- **Vincoli tecnici obbligatori**: l'interazione primaria non deve usare meccaniche di loop, urgenza artificiale o escalation di notifiche.
- **Vietato**: pattern di pressione (streak, countdown, FOMO), gating di funzionalita critiche dietro stimoli emotivi.

### 1.2 No spam economy
- **Principio**: nessuna monetizzazione basata su sfruttamento relazionale.
- **Vincoli tecnici obbligatori**: il sistema non deve incentivare volumi di messaggi o inviti come metrica di valore.
- **Vietato**: meccaniche di reward per inviti, broadcast massivo o crescita forzata di audience.

### 1.3 No gamification tossica
- **Principio**: nessun meccanismo che incentivi dipendenza o competizione tossica.
- **Vincoli tecnici obbligatori**: nessuna logica di ranking o progressione competitiva applicata alle relazioni.
- **Vietato**: livelli, badge o score di status sociale legati a interazioni.

### 1.4 Diritto all'oblio
- **Principio**: controllo e portabilita dei dati relazionali.
- **Vincoli tecnici obbligatori**: il sistema deve supportare cancellazione effettiva dei dati personali e delle relazioni associate.
- **Vietato**: retention non dichiarata o irreversibile di dati personali o relazionali.

### 1.5 Proprieta del dato
- **Principio**: dati relazionali sotto controllo degli utenti e delle community.
- **Vincoli tecnici obbligatori**: il modello dati deve permettere estrazione e trasferimento senza perdita semantica delle relazioni.
- **Vietato**: lock-in tramite formati proprietari che impediscono portabilita del contesto.

### 1.6 Trasparenza AI
- **Principio**: nessuna decisione opaca o non verificabile.
- **Vincoli tecnici obbligatori**: ogni intervento AI deve essere tracciabile e identificabile come assistenza.
- **Vietato**: suggerimenti o modifiche non attribuibili o non spiegabili all'utente.

---
## 2. USP "IRIS = Protocollo di Relazione" → Vincoli Architetturali
- **Principio**: la relazione e l'oggetto primario, non il messaggio.
- **Vincoli tecnici**:
  - IRIS non puo supportare comunicazione piatta non strutturata come modalita primaria.
  - La comunicazione deve essere sempre legata a un contesto relazionale con stato esplicito.
  - Il modello deve distinguere tra evento comunicativo e stato della relazione.
  - La persistenza del contesto e un requisito di base, non opzionale.
- **Conseguenza architetturale**:
  - La "chat infinita" non puo essere l'asse portante del sistema.
  - Messaggi senza contesto non possono generare stato relazionale valido.

---
## 3. Identita e Governance → Vincoli di Sistema
### 3.1 Identita fluida ma non anonima
- **Consentito**: identita adattiva per contesto con alias e ruoli variabili.
- **Vietato**: anonimato totale che impedisce responsabilita relazionale minima.
- **Non neutralita richiesta**: il sistema deve garantire un minimo di affidabilita dell'identita per validare un contesto.

### 3.2 Root identity non eliminabile
- **Consentito**: disattivazione o sospensione.
- **Vietato**: cancellazione totale della root identity se rompe la continuita dei contesti.
- **Non neutralita richiesta**: il sistema deve preservare la traccia di continuita relazionale anche in caso di uscita.

### 3.3 Alias come projection
- **Consentito**: alias per contesto o ruolo specifico.
- **Vietato**: alias che permettono duplicazione di identita come entita indipendenti.
- **Non neutralita richiesta**: l'alias deve essere sempre proiezione di una root identity verificabile.

### 3.4 Governance soft ma difendibile
- **Consentito**: regole esplicite di ruolo e transizione definite per contesto.
- **Vietato**: enforcement opaco o moderazione centrale non dichiarata.
- **Non neutralita richiesta**: il sistema deve applicare le regole esplicite e non restare neutro rispetto a violazioni di contesto.

### 3.5 Anti-sybil compatibile con UX
- **Consentito**: meccanismi leggeri di affidabilita identitaria.
- **Vietato**: barriere enterprise o verifiche invasive come prerequisito globale.
- **Non neutralita richiesta**: il sistema deve ridurre attacchi sybil senza trasformarsi in piattaforma di compliance.

---
## 4. AI e Social Coach → Vincoli di Integrazione
- **AI opt-in**: l'AI deve essere attivata per scelta dell'utente o del contesto; default disattivo.
- **AI non sostitutiva**: l'AI non puo prendere decisioni o agire come autorita relazionale.
- **Social Coach opzionale**: il coach e un layer separato, non parte del core relazionale.

### Perimetro di osservazione
- L'AI puo osservare solo dati necessari al contesto attivo.
- L'AI non puo aggregare dati cross-contesto senza consenso esplicito.

### Limiti di intervento
- **Dati che l'AI non puo usare**: contenuti privati non condivisi, segnali biometrici, dati esterni non autorizzati.
- **Azioni che l'AI non puo compiere**: modificare ruoli, imporre regole, avviare azioni per conto dell'utente.
- **Sempre visibile all'utente**: quando l'AI e attiva, cosa ha osservato, e quale suggerimento ha prodotto.

---
## 5. Community, Memoria e Reputazione → Vincoli di Dominio
- **Memoria**:
  - **Dove risiede**: la memoria primaria e legata al contesto di community, non al profilo globale dell'utente.
  - **Natura**: la memoria e consultiva, non prescrittiva o punitiva.
- **Reputazione**:
  - **Composita e non trasferibile**: la reputazione esiste solo all'interno del contesto che la genera.
  - **Limiti**: nessuna reputazione globale o portable tra community.
- **Vietato**:
  - Ranking globali.
  - Score nascosti o non spiegabili.
  - Potere sociale automatico derivato da punteggi.

---
## 6. Scope MVP → Vincoli di Esclusione
- **Dominio**: il modello non puo includere token, wallet, marketplace o governance on-chain avanzata.
- **API**: non possono esporre endpoint che anticipino ads, trading o reward economici.
- **Anticipazione "per comodita"**: e vietato aggiungere campi o logiche future che introducono coupling verso monetizzazione o compliance.

### Aree ad alto rischio (vietate nel perimetro MVP)
- Governance on-chain avanzata.
- Marketplace o scambi economici interni.
- Ads o profilazione pubblicitaria.
- Enterprise admin complesso (audit, policy, retention legale).

---
## 7. Vincoli di Allineamento con Core Condiviso (Colibri)
- **IRIS puo estendere**: moduli di interazione e UI, adapter di integrazione, logiche di presentazione dei contesti.
- **IRIS non puo modificare**: modello relazionale di base, stati, ruoli e regole di transizione definiti dal core.
- **Astrazioni condivisibili**: schemi dati, API di accesso, meccanismi di serializzazione dei contesti.
- **Violazione del core**: qualsiasi logica di business o feature che cambi semantica degli stati relazionali o la continuita del contesto.

