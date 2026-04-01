# IRIS — STEP A: Stress Test della Fase 0
---

## 1. Tensioni Strutturali
### 1.1 Identita fluida ↔ Antifrode / Proof of Human
- **Cosa e dichiarato**: il sistema e community-first, non enterprise-only, e valorizza contesti e ruoli; non e privacy-radical.
- **Dove nasce la tensione**: identita e relazioni devono essere abbastanza flessibili da supportare comunità leggere, ma serve anche un livello minimo di integrita umana per evitare abuso o falsificazione di contesti.
- **Rischio architetturale**: se l'identita e troppo fluida, il modello relazionale perde affidabilita; se l'identita e troppo rigida, si contraddice la promessa di accessibilita e si introduce una logica enterprise di controllo.
- **Chiarimento decisionale obbligatorio**: definire il livello minimo di affidabilita dell'identita richiesto per un contesto relazionale valido, senza introdurre meccanismi enterprise.

### 1.2 AI opt-in ↔ Social Coach persistente
- **Cosa e dichiarato**: AI-augmented, non AI-driven; trasparenza sul ruolo dell'AI e nessuna decisione opaca.
- **Dove nasce la tensione**: un "coach" persistente implica continuita e presenza costante, che puo essere percepita come guida implicita, anche se l'utente non la richiede.
- **Rischio architetturale**: se l'AI diventa persistente per default, si viola l'assunzione di opt-in reale; se e sempre opzionale, il valore percepito della relazione assistita puo non emergere.
- **Chiarimento decisionale obbligatorio**: stabilire se la presenza dell'AI e per contesto, per sessione o per utente, e quando l'utente deve esprimere consenso esplicito.

### 1.3 Community-first ↔ Multi-community per utente
- **Cosa e dichiarato**: community-first, con contesti relazionali persistenti e ruoli definiti; non social engagement-driven.
- **Dove nasce la tensione**: un singolo utente puo appartenere a piu community con ruoli divergenti; il sistema privilegia il contesto, ma l'utente resta nodo trasversale.
- **Rischio architetturale**: se il modello privilegia solo il contesto, si perde continuita personale; se privilegia l'utente, si riporta il design verso social graph individuale.
- **Chiarimento decisionale obbligatorio**: definire se l'identita dell'utente e unica e cross-contesto o se ogni contesto ha identita relazionale autonoma con limiti di correlazione.

---
## 2. Ambiguita Semantiche Pericolose
### 2.1 "Memoria strutturata"
- **Perche e ambiguo**: non specifica se si tratta di cronologia, stato, o modello relazionale persistente.
- **Interpretazione errata possibile**: puo essere confusa con semplice archiviazione dei messaggi o con un database di profili comportamentali.
- **Perimetro concettuale da fissare ora**: chiarire che la memoria riguarda lo stato delle relazioni e dei contesti, non la raccolta espansa di contenuti o segnali comportamentali.

### 2.2 "Governance soft"
- **Perche e ambiguo**: non definisce confini tra regole sociali e regole di sistema.
- **Interpretazione errata possibile**: puo diventare un insieme implicito di policy non dichiarate o un surrogato di moderazione centralizzata.
- **Perimetro concettuale da fissare ora**: definire che la governance riguarda solo ruoli, stati e regole di transizione esplicite, non moderazione opaca o enforcement esterno.

### 2.3 "AI che migliora le relazioni"
- **Perche e ambiguo**: non distingue tra assistenza informativa e intervento comportamentale.
- **Interpretazione errata possibile**: puo essere interpretata come AI che ottimizza le relazioni secondo metriche di engagement o benessere non dichiarate.
- **Perimetro concettuale da fissare ora**: stabilire che l'AI supporta la comprensione del contesto e la riduzione del rumore, non valuta o dirige le relazioni.

---
## 3. Scope Creep Latente
### 3.1 Wallet / Token / Reputation
- **Rischio concreto**: l'introduzione di reputazione o tokenizzazione sposta il sistema da protocollo relazionale a sistema di incentivi.
- **Direzione di deriva probabile**: meccaniche di punteggio, accesso condizionato e monetizzazione indiretta dei ruoli.
- **Chiarimento di confine necessario**: escludere qualsiasi meccanismo di valore o reputazione numerica dal perimetro MVP e dal core condiviso.

### 3.2 Interoperabilita (bridge verso piattaforme esterne)
- **Rischio concreto**: la compatibilita con piattaforme esterne impone modelli di dati e flussi non allineati al protocollo relazionale.
- **Direzione di deriva probabile**: riduzione del modello a chat compatibile e perdita di stati relazionali come primari.
- **Chiarimento di confine necessario**: definire che il protocollo relazionale non si adatta a modelli esterni; eventuali bridge non possono cambiare il core.

---
## 4. Assunzioni Critiche Non Dichiarate
### 4.1 Disponibilita degli utenti ad accettare maggiore struttura relazionale
- **Assunzione**: gli utenti sono disposti a definire ruoli e stati in modo esplicito.
- **Perche va resa esplicita**: senza questa disponibilita, il modello relazionale perde adozione e si trasforma in messaggistica tradizionale, invalidando la USP.

### 4.2 Accettazione di churn iniziale
- **Assunzione**: una parte degli utenti abbandonera nelle fasi iniziali a causa di onboarding piu strutturato.
- **Perche va resa esplicita**: senza accettare churn, la pressione a semplificare il modello porta a tagliare il core relazionale.

### 4.3 Priorita della coerenza d'uso rispetto alla crescita rapida
- **Assunzione**: la coerenza del protocollo e piu importante della crescita di utenti nel breve periodo.
- **Perche va resa esplicita**: senza questa priorita, il sistema rischia compromessi che lo allineano a social o chat generiche, rendendo impossibile il posizionamento definito.

---
## Output dello Stress Test
Il documento identifica tensioni, ambiguita, rischi di deriva e assunzioni critiche che richiedono chiarimenti decisionali prima di qualsiasi traduzione in vincoli tecnici.
