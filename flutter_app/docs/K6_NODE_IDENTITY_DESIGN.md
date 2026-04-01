# K6 / K6.1 — Node Identity Design

## Scopo

Fornire un identificatore **stabile** e **persistente** del nodo, puramente infrastrutturale, per ownership lock (futuro upgrade K4.x), audit distribuito e coordinazione multi-node. L’implementazione è **FileBasedNodeIdentityProvider** (K6.1): genera un nodeId deterministico da path + salt (senza PID), lo persiste su `.node_identity` e lo riusa; file esistenti restano validi (compatibilità retroattiva).

- **Posizione**: `lib/flow/infrastructure/adapter/node_identity/node_identity_provider.dart`
- **Port**: `NodeIdentityProvider` (getNodeId)
- **Comportamento**: non influenza dominio, hash o replay; nessuna entropia runtime (no UUID, Random, DateTime.now(), PID).

---

## K6 vs K6.1

| Aspetto | K6 | K6.1 |
|--------|----|------|
| Input hash | path + **pid** + salt | **canonicalAbsolutePath** + salt |
| Dipendenza da processo | Sì (pid) | No |
| Rigenerabilità | No (stesso path + pid diverso dopo restart → ID diverso) | Sì (stesso path → stesso ID anche dopo cancellazione file) |
| Compatibilità file esistenti | — | Sì: se `.node_identity` esiste e è valido, non si rigenera |

---

## Algoritmo di generazione (K6.1)

Si applica **solo alla prima creazione** del file `.node_identity`. Se il file esiste già e il contenuto è valido, viene restituito tale valore senza rigenerare.

```
nodeId = toLowerCase(hex(SHA256(canonicalAbsolutePath + constantSalt)))
```

- **canonicalAbsolutePath**: percorso canonico della directory di lavoro (`workingDirectory.uri.resolve('.').toFilePath()`), normalizzato (nessuno slash finale), coerente cross-platform. Non si usano variabili d’ambiente, hostname, MAC o fingerprint.
- **constantSalt**: stringa costante nel codice (`iris.node_identity.v1`).

Si usa **package:crypto** (sha256); il digest è convertito in stringa esadecimale **lowercase** (64 caratteri, solo `[0-9a-f]`).

---

## Motivazione rimozione PID (K6.1)

- **Rigenerabilità**: con il PID, se il file veniva cancellato, un nuovo processo (nuovo PID) produceva un nodeId diverso. Senza PID, stesso path → stesso nodeId anche dopo cancellazione e rigenerazione.
- **Indipendenza dal runtime**: il nodeId non dipende dall’istanza del processo; è puramente legato all’“installazione” (directory).
- **Stabilità**: nessuna entropia temporale o di processo; solo path + costante.
- **Compatibilità**: i file `.node_identity` già scritti in K6 (con ID generato da path+pid+salt) restano validi: se il file esiste e il contenuto è 64 hex lowercase, viene restituito così com’è.

---

## Motivazione SHA256

- **Deterministico**: stesso input → stesso nodeId.
- **Stabile nel tempo**: non dipende da clock o random.
- **Unico per installazione**: path canonico + salt differenziano directory.
- **Non reversibile**: solo hash hex, nessun path in chiaro.

---

## Perché no UUID

- UUID richiederebbe entropia (random o timestamp), incompatibile con “nessuna entropia runtime nel dominio”.
- SHA256(canonicalPath + salt) è deterministico e ripetibile per la stessa directory.

---

## Proprietà di rigenerabilità (K6.1)

- **Stesso path → stesso ID**: cancellando `.node_identity` e chiamando di nuovo getNodeId(), il nuovo ID coincide con il precedente (stesso path + stesso salt).
- **Nessun PID**: il valore non cambia tra riavvii o processi diversi sulla stessa directory.

---

## Garanzie di stabilità

- **Stabile nel tempo**: una volta scritto (o rigenerato), il nodeId non cambia per quella directory.
- **Indipendente da clock e processo**: nessun DateTime.now(), nessun PID.
- **Cache in memoria**: dopo il primo load il valore è in una variabile privata; le chiamate successive non rileggono il file.
- **File vuoto**: se `.node_identity` esiste ma è vuoto → rigenerazione con l’algoritmo K6.1.
- **File corrotto**: contenuto non valido (non 64 caratteri hex lowercase) → **NodeIdentityException**.
- **File esistente valido**: non si rigenera e non si valida contro l’algoritmo; si restituisce il valore esistente (compatibilità retroattiva).

---

## Validazione file

- **Valido**: 64 caratteri, hex lowercase, solo `[0-9a-f]`.
- **Invalido** → NodeIdentityException.
- **Vuoto** → rigenerare con nuovo algoritmo.

---

## Persistenza

- **File**: `.node_identity` nella directory di lavoro (o iniettata).
- **Contenuto**: solo la stringa nodeId (64 hex), nessun JSON, metadata o timestamp.
- **Lazy initialization**: creazione/lettura alla prima getNodeId().

---

## Error handling

Tutti gli errori di I/O o di contenuto → **NodeIdentityException** (messaggio e opzionale cause). Non si propagano FileSystemException. Casi tipici: impossibilità a scrivere/leggere, file corrotto.

---

## Interazione futura con Lock

Il nodeId può essere usato come **ownerId** in un upgrade del lock (K4.x) con NodeIdentityProvider reale: stesso contratto (stringa stabile), nessuna dipendenza dal Core.

---

## Limiti (non cluster-aware)

- Un nodo = una directory; nessun registry di cluster, identità di rete, MAC o fingerprint.
- Nessuna identità basata su environment; identità da path + salt e file locale.

---

## Test (K6.1)

- **test/flow/infrastructure/node_identity/node_identity_provider_test.dart**:
  - Deterministic regeneration: genera, cancella file, rigenera → stesso ID.
  - Persistence: prima/seconda chiamata stesso valore; nuova istanza stesso ID; assenza file → crea file valido.
  - Backward compatibility: file con ID valido scritto a mano → getNodeId() restituisce lo stesso, nessuna rigenerazione.
  - Corrupted file: contenuto invalido → NodeIdentityException; file vuoto → rigenera.
  - Isolation: nessun uso di Platform.pid, Random, UUID, Core.

K6.1 è completo con nodeId rigenerabile, nessuna dipendenza da PID, compatibilità retroattiva e documentazione aggiornata.
