# IRIS — UI Semantics Mapping: Componente → Significato → Rischio

> Mapping tra componenti UI, significato semantico espresso, e rischi UX mitigati.  
> Ogni componente UI deve apparire almeno una volta.

---

## Tabella: Mapping Completo

| Componente | Concetto Espresso | Rischio Mitigato | Documento | Scenario UX |
|-----------|-------------------|------------------|-----------|-------------|
| **ThreadListView** | Lista finita di thread. Ordinamento statico documentato. | Bypass finitudine percepita | STEP 4E §2.1 | UX-01 |
| **ThreadListView** | Nessun ranking intelligente. Nessuna priorità implicita. | Inferenza priorità / importanza | STEP 4E §2.1 | UX-03 |
| **ThreadListView** | Partecipanti in ordine randomizzato (non persistente). | Ricostruzione implicita del grafo sociale | STEP 4D.5 §1 | UX-02 |
| **ThreadListView** | Timestamp arrotondato (bucket 5 secondi). | Correlazione temporale manuale | STEP 4D.5 §4 | UX-07 |
| **ThreadListView** | Fine lista thread esplicita. | Pattern di dipendenza comportamentale | STEP 4E §2 | UX-05 |
| **ThreadListView** | Paginazione obbligatoria (max 50 thread per pagina). | Bypass della finitudine percepita | STEP 4E §2 | UX-01 |
| **ThreadDetailView** | Thread obbligatorio. Nessun messaggio senza thread. | Abuse di errori e retry visibili | STEP 4E §1 | UX-08 |
| **ThreadDetailView** | Stato thread sempre visibile (OPEN / PAUSED / CLOSED / ARCHIVED). | Gaming dello stato (READ, DELIVERED, etc.) | STEP 4E §3 | UX-09 |
| **ThreadDetailView** | Messaggi paginati (window finita, max 100 messaggi per pagina). | Bypass della finitudine percepita | STEP 4E §2.2 | UX-01 |
| **ThreadDetailView** | Pulsante esplicito "Carica messaggi precedenti" (se disponibile). | Pattern di dipendenza comportamentale | STEP 4E §2.2 | UX-05 |
| **ThreadDetailView** | Partecipanti in ordine randomizzato (non persistente). | Ricostruzione implicita del grafo sociale | STEP 4D.5 §1 | UX-02 |
| **ThreadDetailView** | Timestamp arrotondati (bucket 5 secondi). | Correlazione temporale manuale | STEP 4D.5 §4 | UX-07 |
| **ThreadDetailView** | Nessun preload aggressivo. | Pattern di dipendenza comportamentale | STEP 4E §2.2 | UX-05 |
| **MessageComponent** | ThreadId obbligatorio. Verifica appartenenza al thread. | Abuse di errori e retry visibili | STEP 4E §1 | UX-08 |
| **MessageComponent** | Stato messaggio sempre visibile (DRAFT / SENT / DELIVERED / READ / ARCHIVED / EXPIRED). | Gaming dello stato (READ, DELIVERED, etc.) | STEP 4E §3 | UX-09 |
| **MessageComponent** | Timestamp arrotondato (bucket 5 secondi). | Correlazione temporale manuale | STEP 4D.5 §4 | UX-07 |
| **MessageComponent** | Nessun metadato nascosto. | Pattern di controllo tramite thread | STEP 4E §2.3 | UX-10 |
| **MessageComponent** | Nessuno stato inferito. | Pattern cognitivi inevitabili non dichiarati | STEP 4G §3.2 | UX-15 |
| **MessageComposer** | ThreadId obbligatorio. | Abuse di errori e retry visibili | STEP 4E §1 | UX-08 |
| **MessageComposer** | Disponibile solo se thread OPEN e utente partecipante. | Gaming dello stato (READ, DELIVERED, etc.) | STEP 4E §2.4 | UX-09 |
| **MessageComposer** | Nessuna auto-suggest. Nessuna predizione testo. | Pattern di dipendenza comportamentale | STEP 4E §2.4 | UX-05 |
| **MessageComposer** | Invio asincrono (non blocca UI). | Pattern di dipendenza comportamentale | STEP 4E §2.4 | UX-05 |
| **MessageComposer** | Stato di errore esplicito (non retry invisibile). | Abuse di errori e retry visibili | STEP 4E §6 | UX-08 |
| **MessageComposer** | Nessun retry automatico silenzioso. | Abuse di errori e retry visibili | STEP 4E §6 | UX-08 |
| **MessageComposer** | Disabilitato se thread non OPEN o utente non partecipante. | Gaming dello stato (READ, DELIVERED, etc.) | STEP 4E §2.4 | UX-09 |
| **Fine lista thread** | Indicatore esplicito che la lista è finita. | Bypass della finitudine percepita | STEP 4E §2 | UX-01 |
| **Fine lista thread** | Nessun suggerimento di refresh o check. | Pattern di dipendenza comportamentale | STEP 4G §3.1 | UX-05 |
| **Nessun messaggio** | Stato del sistema: non ci sono messaggi nel thread. | Pattern cognitivi inevitabili non dichiarati | STEP 4G §3.2 | UX-15 |
| **Nessun messaggio** | Non interpretazione sociale del silenzio. | Uso strategico del silenzio / non-risposta | STEP 4G §3.2 | UX-12 |
| **Carica messaggi precedenti** | Azione esplicita dell'utente per caricare una finestra finita. | Bypass della finitudine percepita | STEP 4E §2.2 | UX-01 |
| **Carica messaggi precedenti** | Non suggerimento di continuità infinita. | Pattern di dipendenza comportamentale | STEP 4E §2.2 | UX-05 |
| **Errore esplicito** | Stato del sistema. Messaggio di errore dichiarativo. | Abuse di errori e retry visibili | STEP 4E §6 | UX-08 |
| **Errore esplicito** | Non retry automatico silenzioso. | Abuse di errori e retry visibili | STEP 4E §6 | UX-08 |
| **Stato thread visibile** | Stato tecnico esplicito (OPEN / PAUSED / CLOSED / ARCHIVED). | Gaming dello stato (READ, DELIVERED, etc.) | STEP 4E §3 | UX-09 |
| **Stato messaggio visibile** | Stato tecnico esplicito (DRAFT / SENT / DELIVERED / READ / ARCHIVED / EXPIRED). | Gaming dello stato (READ, DELIVERED, etc.) | STEP 4E §3 | UX-09 |
| **Partecipanti randomizzati** | Ordine non persistente. Randomizzazione per request. | Ricostruzione implicita del grafo sociale | STEP 4D.5 §1 | UX-02 |
| **Timestamp arrotondati** | Bucket 5 secondi. Precisione privacy-first. | Correlazione temporale manuale | STEP 4D.5 §4 | UX-07 |
| **Copy dichiarativo** | Solo informazione tecnica. Nessun nudging. | Pattern cognitivi inevitabili non dichiarati | STEP 4G §3.1 | UX-15 |
| **Copy dichiarativo** | Nessuna interpretazione sociale. | Uso strategico del silenzio / non-risposta | STEP 4G §3.2 | UX-12 |

---

## Riepilogo Rischi per Componente

### ThreadListView
- **Rischi mitigati**: UX-01, UX-02, UX-03, UX-05, UX-07
- **Concetti espressi**: Finitudine, nessun ranking, privacy, paginazione
- **Documenti**: STEP 4E §2.1, STEP 4D.5 §1, STEP 4D.5 §4

### ThreadDetailView
- **Rischi mitigati**: UX-01, UX-02, UX-05, UX-07, UX-08, UX-09
- **Concetti espressi**: Thread-first, finitudine, stato esplicito, privacy
- **Documenti**: STEP 4E §1, STEP 4E §2.2, STEP 4E §3, STEP 4D.5 §1, STEP 4D.5 §4

### MessageComponent
- **Rischi mitigati**: UX-07, UX-08, UX-09, UX-10, UX-15
- **Concetti espressi**: Thread-first, stato esplicito, privacy, nessuna inferenza
- **Documenti**: STEP 4E §1, STEP 4E §3, STEP 4D.5 §4, STEP 4G §3.2

### MessageComposer
- **Rischi mitigati**: UX-05, UX-08, UX-09
- **Concetti espressi**: Thread-first, stato esplicito, nessun auto-suggest, errore esplicito
- **Documenti**: STEP 4E §1, STEP 4E §2.4, STEP 4E §6

---

## Note di Tracciabilità

Ogni componente UI:
1. Esprime concetti semantici dichiarati
2. Mitiga rischi UX specifici
3. È tracciabile a documenti vincolanti
4. È protetto da test semantici

Se un componente UI non è tracciabile a questo mapping, **la PR viene rifiutata**.
