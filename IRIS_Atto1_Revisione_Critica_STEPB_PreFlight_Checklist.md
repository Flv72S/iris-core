# IRIS — Atto 1: Revisione Critica STEP B + Pre-Flight Checklist
---

## 1. Vincoli Robusti
### 1.1 Principi Etici (STEP B 1.1–1.6 / Pre-Flight 1)
- **Riferimento**: STEP B 1.1 (No dark pattern); Pre-Flight 1.1  
  **Perche e solido**: vieta pattern specifici (streak, countdown, FOMO, gating emotivo).  
  **Vieta**: meccaniche di pressione e stimoli emotivi per forzare uso.
- **Riferimento**: STEP B 1.2 (No spam economy); Pre-Flight 1.3  
  **Perche e solido**: vieta incentivi al volume e reward per inviti.  
  **Vieta**: meccaniche di reward per inviti, broadcast massivo, crescita forzata.
- **Riferimento**: STEP B 1.3 (No gamification tossica); Pre-Flight 1.2  
  **Perche e solido**: vieta ranking e progressione competitiva.  
  **Vieta**: livelli, badge e score di status sociale.
- **Riferimento**: STEP B 1.6 (Trasparenza AI)  
  **Perche e solido**: richiede tracciabilita e identificazione degli interventi AI.  
  **Vieta**: suggerimenti non attribuibili o non spiegabili.

### 1.2 AI e Social Coach (STEP B 4 / Pre-Flight 5)
- **Riferimento**: STEP B 4, Limiti di intervento  
  **Perche e solido**: elenca divieti puntuali.  
  **Vieta**: uso di dati biometrici, modifiche di ruoli, imposizione di regole, azioni per conto utente.

### 1.3 Community e Reputazione (STEP B 5 / Pre-Flight 4)
- **Riferimento**: STEP B 5 (Vietato)  
  **Perche e solido**: elenca divieti espliciti.  
  **Vieta**: ranking globali, score nascosti, potere sociale automatico.

### 1.4 Scope MVP (STEP B 6 / Pre-Flight 6)
- **Riferimento**: STEP B 6 (Aree ad alto rischio vietate)  
  **Perche e solido**: elenca esclusioni nette.  
  **Vieta**: governance on-chain avanzata, marketplace, ads, enterprise admin complesso.

---
## 2. Vincoli Ambigui o Deboli
### 2.1 Principi Etici (STEP B 1.4–1.5 / Pre-Flight 1)
- **Riferimento**: STEP B 1.4 (Diritto all'oblio); Pre-Flight 1.4  
  **Ambiguita**: scope e condizione; non definisce cosa e "cancellazione effettiva".  
  **Rischio**: retention logica mascherata come anonimizzazione; cancellazioni parziali.  
  **Rafforzamento**: definire esplicitamente quali dati devono essere cancellabili e quali metadati sono vietati.
- **Riferimento**: STEP B 1.5 (Proprieta del dato); Pre-Flight 1.5  
  **Ambiguita**: linguaggio; "portabilita garantita" non specifica perimetro semantico.  
  **Rischio**: esportazioni parziali che non ricostruiscono il contesto relazionale.  
  **Rafforzamento**: specificare che la portabilita deve preservare stati, ruoli e contesti senza perdita semantica.

### 2.2 USP Protocollo di Relazione (STEP B 2 / Pre-Flight 2)
- **Riferimento**: STEP B 2; Pre-Flight 2.1  
  **Ambiguita**: linguaggio; "comunicazione non piatta" non e definita.  
  **Rischio**: implementare chat tradizionale con metadati minimi e sostenerla come "non piatta".  
  **Rafforzamento**: definire quali elementi strutturali minimi rendono la comunicazione non piatta.
- **Riferimento**: STEP B 2; Pre-Flight 2.4  
  **Ambiguita**: scope; "chat infinita" e "asse portante" non sono misurabili.  
  **Rischio**: chat tradizionale come default con un layer di contesto nominale.  
  **Rafforzamento**: definire quando un flusso e considerato "primario" e vietarlo se non contestualizzato.
- **Riferimento**: Pre-Flight 2.2–2.3  
  **Ambiguita**: linguaggio; "thread/contesti previsti strutturalmente" e "stato esplicito" non hanno criteri.  
  **Rischio**: contesto trattato come tag non vincolante.  
  **Rafforzamento**: imporre che ogni messaggio valido sia associato a un contesto con stato verificabile.

### 2.3 Identita e Governance (STEP B 3 / Pre-Flight 3)
- **Riferimento**: STEP B 3.1; Pre-Flight 3.3  
  **Ambiguita**: condizione; "anonimato forte" non e definito.  
  **Rischio**: anonimato de facto mascherato da alias non tracciabili.  
  **Rafforzamento**: definire il livello minimo di responsabilita e tracciabilita consentito.
- **Riferimento**: STEP B 3.2; Pre-Flight 3.1  
  **Ambiguita**: linguaggio; "root identity non eliminabile" confligge con diritto all'oblio.  
  **Rischio**: impossibilita di compliance con oblio oppure retention impropria.  
  **Rafforzamento**: separare chiaramente continuita relazionale e dati personali cancellabili.
- **Riferimento**: STEP B 3.3; Pre-Flight 3.2  
  **Ambiguita**: scope; "projection" non e definito.  
  **Rischio**: alias gestiti come identita parallele.  
  **Rafforzamento**: definire il legame minimo tra alias e root identity.
- **Riferimento**: STEP B 3.4; Pre-Flight 3  
  **Ambiguita**: linguaggio; "governance soft ma difendibile" non fissa confini.  
  **Rischio**: enforcement arbitrario o moderazione opaca.  
  **Rafforzamento**: stabilire che solo regole esplicite e verificabili sono applicabili.
- **Riferimento**: STEP B 3.5; Pre-Flight 3.4  
  **Ambiguita**: condizione; "compatibile con UX dichiarata" non e definita.  
  **Rischio**: introduzione di barriere severe mascherate da UX.  
  **Rafforzamento**: definire il limite massimo di frizione consentito per anti-sybil.

### 2.4 AI e Social Coach (STEP B 4 / Pre-Flight 5)
- **Riferimento**: STEP B 4 (AI opt-in); Pre-Flight 5.1  
  **Ambiguita**: scope; "per scelta dell'utente o del contesto" consente opt-in implicito.  
  **Rischio**: attivazioni automatiche mascherate da consenso di contesto.  
  **Rafforzamento**: richiedere consenso esplicito e revocabile per utente e contesto.
- **Riferimento**: STEP B 4 (Perimetro di osservazione); Pre-Flight 5.2  
  **Ambiguita**: linguaggio; "dati necessari" non e definito.  
  **Rischio**: raccolta estesa giustificata come necessaria.  
  **Rafforzamento**: fissare una lista minima di categorie ammesse e vietare default estesi.
- **Riferimento**: Pre-Flight 5.5  
  **Ambiguita**: linguaggio; "non media emozioni o conflitti" non ha criteri.  
  **Rischio**: interventi direttivi mascherati da supporto.  
  **Rafforzamento**: vietare output che raccomandano azioni su relazioni o conflitti.

### 2.5 Community, Memoria e Reputazione (STEP B 5 / Pre-Flight 4)
- **Riferimento**: STEP B 5 (Memoria consultiva)  
  **Ambiguita**: linguaggio; "consultiva" non e definita.  
  **Rischio**: memoria usata come gating o scoring indiretto.  
  **Rafforzamento**: definire che la memoria non puo bloccare o autorizzare azioni.
- **Riferimento**: STEP B 5 (Reputazione composita)  
  **Ambiguita**: scope; "composita" non indica criteri o limiti.  
  **Rischio**: reputazioni trasferite implicitamente tramite metriche aggregate.  
  **Rafforzamento**: stabilire che qualsiasi reputazione ha validita locale e non aggregabile globalmente.

### 2.6 Scope MVP e Divieti (STEP B 6 / Pre-Flight 6)
- **Riferimento**: STEP B 6 (Anticipazione "per comodita"); Pre-Flight 6.2  
  **Ambiguita**: linguaggio; "hook anticipatorio non giustificato" e valutativo.  
  **Rischio**: introdurre campi futuri con giustificazioni deboli.  
  **Rafforzamento**: definire che ogni campo o API deve essere usata dal MVP o e vietata.

### 2.7 Core Condiviso (STEP B 7 / Pre-Flight 7)
- **Riferimento**: STEP B 7; Pre-Flight 7.1–7.4  
  **Ambiguita**: scope; "modifica semantica", "accoppiamento improprio", "estensioni permesse" non sono misurabili.  
  **Rischio**: adattamenti del core giustificati come estensioni.  
  **Rafforzamento**: definire criteri di violazione (es. cambio di stati, ruoli, transizioni o identita dei contesti).

---
## 3. Zone Grigie Critiche
### 3.1 Diritto all'oblio ↔ Root identity non eliminabile
- **Impatto**: conflitto diretto tra cancellazione e continuita relazionale; rischio di non conformita o retention indebita.
- **Decisione necessaria**: definire il confine tra identita persistente e dati cancellabili prima di Fase 1.

### 3.2 Definizione operativa di "contesto relazionale"
- **Impatto**: senza definizione, la comunicazione puo degenerare in chat tradizionale con metadati decorativi.
- **Decisione necessaria**: fissare elementi minimi che rendono un contesto valido e verificabile.

### 3.3 Governance soft e non neutralita
- **Impatto**: rischio di enforcement arbitrario o, al contrario, neutralita che rende inefficaci le regole.
- **Decisione necessaria**: definire quali regole sono applicabili dal sistema e con quali condizioni di verificabilita.

### 3.4 Perimetro di osservazione AI
- **Impatto**: rischio di raccolta estesa di dati sotto pretesto di "necessita".
- **Decisione necessaria**: fissare un elenco minimo di dati osservabili e un limite di retention.

### 3.5 Reputazione locale vs segnali cross-community
- **Impatto**: aggregazioni indirette possono creare reputazione globale implicita.
- **Decisione necessaria**: stabilire divieti espliciti su aggregazione e trasferimento di segnali.

### 3.6 "Antifrode compatibile con UX dichiarata"
- **Impatto**: assenza di definizione di UX consente barriere elevate e contrarie al posizionamento.
- **Decisione necessaria**: definire il livello massimo di frizione consentito per anti-sybil.

---
## 4. Sintesi e Priorita
### Tabella di categorizzazione dei vincoli
| Vincolo | Riferimento | Stato |
|---|---|---|
| No dark pattern (streak, countdown, FOMO, gating emotivo) | STEP B 1.1 / Pre-Flight 1.1 | ✅ Solido |
| No spam economy (reward inviti, broadcast massivo) | STEP B 1.2 / Pre-Flight 1.3 | ✅ Solido |
| No gamification tossica (ranking, progressione competitiva) | STEP B 1.3 / Pre-Flight 1.2 | ✅ Solido |
| Diritto all'oblio (cancellazione effettiva) | STEP B 1.4 / Pre-Flight 1.4 | ❌ Critico |
| Proprieta del dato e portabilita | STEP B 1.5 / Pre-Flight 1.5 | ⚠️ Da rafforzare |
| Trasparenza AI (tracciabilita interventi) | STEP B 1.6 | ✅ Solido |
| Comunicazione non piatta come modalita primaria | STEP B 2 / Pre-Flight 2.1 | ⚠️ Da rafforzare |
| Comunicazione legata a contesto con stato esplicito | STEP B 2 / Pre-Flight 2.2–2.3 | ⚠️ Da rafforzare |
| Distinzione evento comunicativo / stato relazione | STEP B 2 | ⚠️ Da rafforzare |
| Persistenza del contesto non opzionale | STEP B 2 | ⚠️ Da rafforzare |
| Chat infinita non asse portante / non default | STEP B 2 / Pre-Flight 2.4 | ⚠️ Da rafforzare |
| Identita fluida ma non anonima | STEP B 3.1 / Pre-Flight 3.3 | ⚠️ Da rafforzare |
| Root identity non eliminabile | STEP B 3.2 / Pre-Flight 3.1 | ❌ Critico |
| Alias come projection della root identity | STEP B 3.3 / Pre-Flight 3.2 | ⚠️ Da rafforzare |
| Governance soft ma difendibile | STEP B 3.4 | ⚠️ Da rafforzare |
| Anti-sybil compatibile con UX | STEP B 3.5 / Pre-Flight 3.4 | ⚠️ Da rafforzare |
| AI opt-in e default disattivo | STEP B 4 / Pre-Flight 5.1 | ⚠️ Da rafforzare |
| AI non sostitutiva | STEP B 4 | ⚠️ Da rafforzare |
| Social Coach opzionale e separato | STEP B 4 / Pre-Flight 5.4 | ⚠️ Da rafforzare |
| Perimetro osservazione AI limitato al contesto | STEP B 4 / Pre-Flight 5.2 | ⚠️ Da rafforzare |
| Divieto aggregazione cross-contesto senza consenso | STEP B 4 | ⚠️ Da rafforzare |
| AI non usa dati biometrici o esterni non autorizzati | STEP B 4 | ✅ Solido |
| AI non modifica ruoli / non impone regole | STEP B 4 | ✅ Solido |
| AI sempre visibile (osservazioni + suggerimenti) | STEP B 4 / Pre-Flight 5.3 | ⚠️ Da rafforzare |
| Memoria per-community, non globale | STEP B 5 / Pre-Flight 4.2 | ⚠️ Da rafforzare |
| Memoria consultiva, non prescrittiva | STEP B 5 / Pre-Flight 4.3 | ⚠️ Da rafforzare |
| Reputazione non trasferibile tra community | STEP B 5 | ⚠️ Da rafforzare |
| Divieto ranking globali / score nascosti / potere automatico | STEP B 5 / Pre-Flight 4.4 | ✅ Solido |
| Esclusione token, wallet, marketplace, governance on-chain avanzata | STEP B 6 / Pre-Flight 6.1–6.3 | ✅ Solido |
| Divieto ads e profilazione pubblicitaria | STEP B 6 / Pre-Flight 6.4 | ✅ Solido |
| Divieto hook anticipatori non giustificati | STEP B 6 / Pre-Flight 6.2 | ⚠️ Da rafforzare |
| Core non modificato semanticamente | STEP B 7 / Pre-Flight 7.1 | ❌ Critico |
| Estensioni permesse e limitate | STEP B 7 / Pre-Flight 7.2 | ⚠️ Da rafforzare |
| Astrazioni condivise limitate a consentite | STEP B 7 / Pre-Flight 7.3 | ⚠️ Da rafforzare |
| Nessun accoppiamento improprio al core | STEP B 7 / Pre-Flight 7.4 | ⚠️ Da rafforzare |

### Priorita di intervento
1. **Critici**: risolvere conflitto oblio/root identity e definire "modifica semantica del core".
2. **Alti**: definire contesto relazionale, anti-sybil compatibile con UX, perimetro AI.
3. **Medi**: rendere misurabili "non piatta", "chat infinita", "memoria consultiva".
4. **Bassi**: migliorare portabilita dati e limiti su reputazione composita.
