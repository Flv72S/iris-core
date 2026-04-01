# KX — Infrastructure Composition Layer Design

## Scopo del composition layer

Costruire un **livello di composizione infrastrutturale** che coordini in modo deterministico:

- **Distributed Lock** (K4.1)
- **Retry Policy** (K5)
- **Storage** (K2 / CloudStoragePort)
- **Signature** (K8 / SignaturePort)
- **Node Identity** (K6.1 / NodeIdentityProvider)

L’orchestratore **non** appartiene al dominio: non modifica Core, non modifica le port esistenti, non introduce nuova entropia. È un **orchestratore puro** che applica un flusso fisso (lock → retry → sign → store) e garantisce il rilascio del lock anche in caso di errore.

---

## Perché è separato dal dominio

- **Nessuna logica di dominio**: il layer non decide *cosa* salvare né *come* interpretare i dati; riceve un `payloadProvider` e un contesto, e coordina le port.
- **Nessuna serializzazione di dominio**: non serializza/deserializza modelli di dominio; lavora su `List<int>` (payload) e su identificatori (operationId, resourceId) passati dall’esterno.
- **Nessuna generazione di identificatori**: operationId e resourceId sono **sempre passati dall’esterno**; nessun UUID, Random o timestamp.
- **Solo orchestrazione**: ordine delle chiamate, gestione lock (acquire + release in finally), propagazione errori.

In questo modo il dominio resta libero da dettagli di lock, retry, firma e storage; la composizione è un unico punto di utilizzo delle port infrastrutturali.

---

## Ordine delle operazioni

Obbligatorio:

1. **LOCK**: `acquireLock(context.resourceId)`
2. **RETRY**: esecuzione di `payloadProvider()` tramite RetryPolicyPort (executeWithRetry)
3. **SIGN**: firma del payload con SignaturePort (signerId da NodeIdentityProvider)
4. **STORE**: `uploadObject(storageBucket, context.resourceId, payload)`
5. **RELEASE LOCK**: `releaseLock(context.resourceId)` in un blocco `finally`, quindi **sempre** eseguito anche in caso di eccezione

Nessun altro ordine è consentito; il lock non deve mai restare acquisito dopo l’uscita dal metodo (successo o fallimento).

---

## Determinismo garantito

- **Nessun timestamp**: nessun uso di DateTime.now() nel modulo composition.
- **Nessun Random / UUID**: operationId e resourceId sono solo propagati; non generati.
- **Nessuna modifica di payload o metadata**: il layer non altera il payload né i metadata della firma (eccetto la costruzione minima di SignatureMetadata con signerId e algorithm per la chiamata a sign).
- **Stateless**: l’orchestratore non mantiene stato tra una chiamata e l’altra; ogni esecuzione dipende solo da contesto e payloadProvider iniettati.

L’output (SignedPayload, eccezioni) è determinato da input e comportamento delle port; nessuna entropia aggiunta dal composition layer.

---

## Interazione tra K4–K8

| Componente | Ruolo nel flusso |
|------------|------------------|
| **K4.1 Distributed Lock** | Acquire su resourceId all’ingresso; release in finally. Evita concorrenza sullo stesso resourceId. |
| **K5 Retry Policy** | Avvolge l’esecuzione di payloadProvider(); ritenta in caso di fallimento secondo la policy iniettata. |
| **K6.1 Node Identity** | Fornisce signerId per SignatureMetadata (sign). |
| **K7/K8 Signature** | Firma il payload prima del salvataggio; restituisce SignedPayload. |
| **K2 Storage (CloudStoragePort)** | Salva il payload (key = resourceId, bucket = storageBucket iniettato). |

Tutte le dipendenze sono iniettate nel costruttore; l’orchestratore non istanzia adapter né accede a filesystem/ambiente direttamente.

---

## API pubblica

- **executeSignedStorageOperation**
  - **context**: `InfrastructureOperationContext` (operationId, resourceId forniti dal chiamante).
  - **payloadProvider**: `Future<List<int>> Function()` che produce il payload da firmare e salvare.
  - **Ritorno**: `Future<SignedPayload>` (risultato della firma).
  - **Bucket**: `storageBucket` passato al costruttore dell’orchestratore; usato per uploadObject.

---

## Error handling

- Se **qualsiasi** step fallisce (retry, sign, storage): l’eccezione viene **propagata**; nessuna swallow.
- Il **lock viene sempre rilasciato** grazie al `finally`.
- Non si trasformano eccezioni, salvo eventuale wrapping infrastrutturale (es. InfrastructureCompositionException) se richiesto in futuro; attualmente si propagano le eccezioni originali.

---

## Limiti (non transazionale distribuito)

- **Nessuna transazione distribuita**: non c’è two-phase commit né coordinazione transazionale tra lock, storage e altri servizi.
- **Nessun timeout globale**, circuit breaker, logging, metrics, audit trail o event sourcing nel layer.
- **Nessuna nuova port o adapter**: il layer usa solo le port e gli adapter già definiti (K2, K4.1, K5, K6.1, K7/K8).

Il composition layer è adatto a un singolo nodo e a storage/lock in-memory o file-based; l’evoluzione verso scenari distribuiti o transazionali richiederà estensioni esterne al layer.

---

## File e modelli

- **infrastructure_operation_context.dart**: `InfrastructureOperationContext(operationId, resourceId)`.
- **infrastructure_exceptions.dart**: `InfrastructureCompositionException` (per eventuale wrapping).
- **infrastructure_orchestrator.dart**: `InfrastructureOrchestrator` con costruttore (lock, retry, storage, signature, nodeIdentity, storageBucket) e `executeSignedStorageOperation`.

---

## Test

- **test/flow/infrastructure/composition/infrastructure_orchestrator_test.dart**:
  1. Happy path: ordine chiamate acquire → retry → payloadProvider → sign → storage.save → release; contenuto e chiave salvati corretti.
  2. Retry failure: payloadProvider sempre in errore → lock rilasciato, eccezione propagata, storage non chiamato.
  3. Signature failure: sign lancia → lock rilasciato, storage non chiamato.
  4. Storage failure: uploadObject lancia → lock rilasciato, eccezione propagata.
  5. Determinism guard: nessun DateTime.now, Random, UUID, import Core nel modulo composition.

KX è completo con orchestratore stateless, ordine operazioni rispettato, lock sempre rilasciato, error propagation corretta e documentazione presente.
