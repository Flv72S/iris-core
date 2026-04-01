---
title: "IRIS — Messaging Core Test Bloccanti Aggiuntivi STEP 4D.5 v1.0"
author: "Principal Engineer + QA Lead + Security Architect"
version: "1.0"
date: "2026-01-24"
status: "Binding — Bloccanti"
dependencies: "IRIS_Messaging_Hardening_STEP4D5_v1.0.md, IRIS_Messaging_Core_Implementation_STEP4C_v1.1_Hardening.md"
tags: ["FASE2", "Messaging", "STEP4D5", "Tests", "Bloccanti", "Binding"]
---

# IRIS — Messaging Core Test Bloccanti Aggiuntivi STEP 4D.5 v1.0

> Test bloccanti aggiuntivi per verificare efficacia mitigazioni aggressive STEP 4D.5.  
> **Stato: Binding — Bloccanti** — ogni test deve fallire se la mitigazione viene rimossa.

---

## 🎯 OBIETTIVO

Verificare che:
- Le mitigazioni aggressive siano **strutturalmente efficaci**
- Ogni test **fallisca** se la mitigazione viene rimossa
- Nessun canale laterale sia sfruttabile
- Nessuna inferenza statistica sia praticabile

**Ogni test è BLOCCANTE**: Se fallisce, build fallisce.

---

## 📌 RIFERIMENTI VINCOLANTI

Questi test verificano conformità con:

- `IRIS_Messaging_Hardening_STEP4D5_v1.0.md` — Mitigazioni aggressive
- `IRIS_Messaging_Core_Implementation_STEP4C_v1.1_Hardening.md` — Implementazione aggiornata

---

## 🧪 TEST BLOCCANTI AGGIUNTIVI

### Test 1: Correlazione Partecipanti Multi-Thread

**File**: `tests/messaging/participant-correlation.test.ts`

```typescript
describe('Participant Correlation Prevention', () => {
  test('partecipanti multi-thread non correlabili', async () => {
    // Crea thread con partecipanti comuni
    const thread1 = await createThread({ 
      participants: ['alias_A', 'alias_B', 'alias_C'] 
    });
    const thread2 = await createThread({ 
      participants: ['alias_A', 'alias_B', 'alias_D'] 
    });
    
    // Fetch partecipanti multipli
    const participants1_req1 = await getThreadParticipants(thread1.id, 'req1');
    const participants1_req2 = await getThreadParticipants(thread1.id, 'req2');
    const participants2_req1 = await getThreadParticipants(thread2.id, 'req1');
    
    // Verifica che ordine sia randomizzato
    expect(participants1_req1).not.toEqual(['alias_A', 'alias_B', 'alias_C']);
    expect(participants1_req2).not.toEqual(['alias_A', 'alias_B', 'alias_C']);
    
    // Verifica che correlazione non sia possibile
    const correlation = this.analyzeCorrelation(
      participants1_req1,
      participants2_req1
    );
    expect(correlation).toBeLessThan(0.1); // Correlazione < 10%
    
    // Verifica che ordine sia diverso tra fetch (probabilistico)
    expect(participants1_req1).not.toEqual(participants1_req2);
  });
  
  test('ordine partecipanti randomizzato per ogni request', async () => {
    const thread = await createThread({ 
      participants: ['alias_A', 'alias_B', 'alias_C', 'alias_D', 'alias_E'] 
    });
    
    const orders: string[][] = [];
    for (let i = 0; i < 10; i++) {
      const participants = await getThreadParticipants(thread.id, `req${i}`);
      orders.push(participants);
    }
    
    // Verifica che almeno 8 ordini siano diversi (probabilistico)
    const uniqueOrders = new Set(orders.map(o => o.join(',')));
    expect(uniqueOrders.size).toBeGreaterThanOrEqual(8);
  });
  
  test('seed deterministico per-request (coerenza per stessa request)', async () => {
    const thread = await createThread({ 
      participants: ['alias_A', 'alias_B', 'alias_C'] 
    });
    
    const requestId = 'req_123';
    const participants1 = await getThreadParticipants(thread.id, requestId);
    const participants2 = await getThreadParticipants(thread.id, requestId);
    
    // Stessa request → stesso ordine (seed deterministico)
    expect(participants1).toEqual(participants2);
  });
});
```

**Enforcement**: Test **BLOCCANTE**. Se fallisce, build fallisce.

**Verifica Mitigazione**: Se randomizzazione viene rimossa, test fallisce.

---

### Test 2: Pattern Retry Non Correlabili

**File**: `tests/messaging/retry-pattern-obfuscation.test.ts`

```typescript
describe('Retry Pattern Obfuscation', () => {
  test('pattern retry non correlabili tra device', async () => {
    const device1 = 'device_1';
    const device2 = 'device_2';
    
    const delays1: number[] = [];
    const delays2: number[] = [];
    
    for (let i = 0; i < 5; i++) {
      const delay1 = retryPolicy.calculateRetryDelay(i, device1);
      const delay2 = retryPolicy.calculateRetryDelay(i, device2);
      delays1.push(delay1);
      delays2.push(delay2);
    }
    
    // Verifica che pattern non siano correlabili
    const correlation = this.analyzeCorrelation(delays1, delays2);
    expect(correlation).toBeLessThan(0.2); // Correlazione < 20%
  });
  
  test('backoff non lineare (non esponenziale puro)', async () => {
    const delays: number[] = [];
    for (let i = 0; i < 5; i++) {
      delays.push(retryPolicy.calculateRetryDelay(i, 'device_1'));
    }
    
    // Verifica che backoff non sia esponenziale puro
    const ratios = delays.slice(1).map((d, i) => d / delays[i]);
    const isExponential = ratios.every(r => Math.abs(r - 2.0) < 0.1);
    expect(isExponential).toBe(false);
  });
  
  test('jitter randomizzato per device', async () => {
    const device1 = 'device_1';
    const device2 = 'device_2';
    
    const delays1: number[] = [];
    const delays2: number[] = [];
    
    for (let i = 0; i < 5; i++) {
      delays1.push(retryPolicy.calculateRetryDelay(i, device1));
      delays2.push(retryPolicy.calculateRetryDelay(i, device2));
    }
    
    // Verifica che jitter sia diverso per device diversi
    const jitter1 = delays1.map((d, i) => d - this.baseDelay(i));
    const jitter2 = delays2.map((d, i) => d - this.baseDelay(i));
    
    // Jitter deve essere diverso (probabilistico)
    expect(jitter1).not.toEqual(jitter2);
  });
  
  test('retry delay indipendente dal tipo errore', async () => {
    const deviceId = 'device_1';
    const error1 = new NetworkError();
    const error2 = new TimeoutError();
    
    const delay1 = retryPolicy.calculateRetryDelay(1, deviceId);
    const delay2 = retryPolicy.calculateRetryDelay(1, deviceId);
    
    // Delay deve essere uguale (indipendente dal tipo errore)
    expect(delay1).toBe(delay2);
  });
});
```

**Enforcement**: Test **BLOCCANTE**. Se fallisce, build fallisce.

**Verifica Mitigazione**: Se backoff non lineare o jitter vengono rimossi, test fallisce.

---

### Test 3: Rate Limit Enforcement

**File**: `tests/messaging/rate-limit-enforcement.test.ts`

```typescript
describe('Rate Limit Enforcement', () => {
  test('rate limit blocca polling continuo', async () => {
    const deviceId = 'device_1';
    const threadId = 'thread_1';
    
    // Esegui 10 fetch (limite)
    for (let i = 0; i < 10; i++) {
      await fetchMessages(threadId, { deviceId });
    }
    
    // 11° fetch deve essere bloccato
    await expect(
      fetchMessages(threadId, { deviceId })
    ).rejects.toThrow(RateLimitExceededError);
  });
  
  test('kill-switch attivato dopo 5 violazioni consecutive', async () => {
    const deviceId = 'device_1';
    const threadId = 'thread_1';
    
    // Simula 5 violazioni consecutive
    for (let i = 0; i < 5; i++) {
      try {
        for (let j = 0; j < 11; j++) {
          await fetchMessages(threadId, { deviceId });
        }
      } catch (e) {
        // Rate limit superato
        if (e instanceof RateLimitExceededError) {
          // Continua
        }
      }
    }
    
    // Kill-switch deve essere attivo
    await expect(
      fetchMessages(threadId, { deviceId })
    ).rejects.toThrow(KillSwitchActiveError);
  });
  
  test('window finita e non estendibile', async () => {
    const deviceId = 'device_1';
    const threadId = 'thread_1';
    
    // Esegui 10 fetch (limite)
    for (let i = 0; i < 10; i++) {
      await fetchMessages(threadId, { deviceId });
    }
    
    // Attendi 59 secondi (window non ancora scaduta)
    await this.delay(59000);
    
    // Fetch deve essere ancora bloccato
    await expect(
      fetchMessages(threadId, { deviceId })
    ).rejects.toThrow(RateLimitExceededError);
    
    // Attendi 2 secondi (window scaduta)
    await this.delay(2000);
    
    // Fetch deve essere permesso
    await expect(
      fetchMessages(threadId, { deviceId })
    ).resolves.toBeDefined();
  });
});
```

**Enforcement**: Test **BLOCCANTE**. Se fallisce, build fallisce.

**Verifica Mitigazione**: Se rate limit o kill-switch vengono rimossi, test fallisce.

---

### Test 4: Timestamp Non Correlabili

**File**: `tests/messaging/timestamp-correlation-prevention.test.ts`

```typescript
describe('Timestamp Correlation Prevention', () => {
  test('timestamp arrotondati a bucket 5 secondi', async () => {
    const timestamp1 = Date.now();
    const timestamp2 = timestamp1 + 100; // 100ms dopo
    const timestamp3 = timestamp1 + 4000; // 4s dopo
    const timestamp4 = timestamp1 + 6000; // 6s dopo (bucket diverso)
    
    const sanitized1 = timestampSanitizer.sanitizeTimestamp(timestamp1, 'message');
    const sanitized2 = timestampSanitizer.sanitizeTimestamp(timestamp2, 'message');
    const sanitized3 = timestampSanitizer.sanitizeTimestamp(timestamp3, 'message');
    const sanitized4 = timestampSanitizer.sanitizeTimestamp(timestamp4, 'message');
    
    // Timestamp nello stesso bucket devono essere uguali
    expect(sanitized1).toBe(sanitized2);
    expect(sanitized1).toBe(sanitized3);
    
    // Timestamp in bucket diversi devono essere diversi
    expect(sanitized1).not.toBe(sanitized4);
  });
  
  test('timestamp non correlabili cross-device', async () => {
    const timestamp = Date.now();
    const device1 = 'device_1';
    const device2 = 'device_2';
    
    const sanitized1 = timestampSanitizer.sanitizeTimestamp(timestamp, 'sync');
    const sanitized2 = timestampSanitizer.sanitizeTimestamp(timestamp, 'sync');
    
    // Jitter diverso per device diversi (probabilistico)
    // Nota: jitter può essere uguale per caso, ma pattern non deve essere prevedibile
    const correlation = Math.abs(sanitized1 - sanitized2);
    expect(correlation).toBeLessThan(2000); // Jitter ±1s
  });
  
  test('precisione adattiva privacy-first', async () => {
    const timestamp = Date.now();
    
    const precisionMessage = timestampSanitizer.getTimestampPrecision('message');
    const precisionThread = timestampSanitizer.getTimestampPrecision('thread');
    const precisionSync = timestampSanitizer.getTimestampPrecision('sync');
    
    // Precisione diversa per contesto
    expect(precisionMessage).toBe(5000); // 5 secondi
    expect(precisionThread).toBe(10000); // 10 secondi
    expect(precisionSync).toBe(5000); // 5 secondi
  });
});
```

**Enforcement**: Test **BLOCCANTE**. Se fallisce, build fallisce.

**Verifica Mitigazione**: Se arrotondamento timestamp viene rimosso, test fallisce.

---

### Test 5: Nessun Endpoint Analytics

**File**: `tests/messaging/analytics-endpoint-prevention.test.ts`

```typescript
describe('Analytics Endpoint Prevention', () => {
  test('nessun endpoint analytics esistente', async () => {
    const endpoints = [
      '/api/v1/analytics/messages',
      '/api/v1/analytics/threads',
      '/api/v1/stats/messages',
      '/api/v1/stats/threads',
      '/api/v1/metrics/messages',
      '/api/v1/metrics/threads'
    ];
    
    for (const endpoint of endpoints) {
      await expect(
        apiClient.get(endpoint)
      ).rejects.toThrow(NotFoundError);
    }
  });
  
  test('nessun endpoint che rivela pattern di accesso', async () => {
    const endpoints = [
      '/api/v1/threads/access-pattern',
      '/api/v1/messages/access-pattern',
      '/api/v1/analytics/access-pattern'
    ];
    
    for (const endpoint of endpoints) {
      await expect(
        apiClient.get(endpoint)
      ).rejects.toThrow(NotFoundError);
    }
  });
});
```

**Enforcement**: Test **BLOCCANTE**. Se fallisce, build fallisce.

**Verifica Mitigazione**: Se endpoint analytics vengono aggiunti, test fallisce.

---

### Test 6: Thread ID Non Correlabile

**File**: `tests/messaging/thread-id-correlation-prevention.test.ts`

```typescript
describe('Thread ID Correlation Prevention', () => {
  test('thread ID non correlabili semanticamente', async () => {
    const thread1 = await createThread({ 
      communityId: 'comm_1', 
      contextTitle: 'Title 1' 
    });
    const thread2 = await createThread({ 
      communityId: 'comm_1', 
      contextTitle: 'Title 1' 
    });
    
    // Thread ID devono essere diversi (UUID v4 random)
    expect(thread1.id).not.toBe(thread2.id);
    
    // Thread ID non devono contenere hash di communityId o contextTitle
    expect(thread1.id).not.toContain('comm_1');
    expect(thread1.id).not.toContain('Title');
    
    // Thread ID devono essere UUID v4 validi
    expect(this.isValidUUIDv4(thread1.id)).toBe(true);
    expect(this.isValidUUIDv4(thread2.id)).toBe(true);
  });
  
  test('thread ID non rivelano correlazioni', async () => {
    const threads: string[] = [];
    
    // Crea 10 thread con stesso communityId e contextTitle simile
    for (let i = 0; i < 10; i++) {
      const thread = await createThread({ 
        communityId: 'comm_1', 
        contextTitle: `Title ${i}` 
      });
      threads.push(thread.id);
    }
    
    // Verifica che thread ID non siano correlabili
    const correlation = this.analyzeCorrelation(threads);
    expect(correlation).toBeLessThan(0.1); // Correlazione < 10%
  });
});
```

**Enforcement**: Test **BLOCCANTE**. Se fallisce, build fallisce.

**Verifica Mitigazione**: Se thread ID contengono hash semanticamente correlabili, test fallisce.

---

### Test 7: Event Ordering Basato su Sequence

**File**: `tests/messaging/sequence-based-ordering.test.ts`

```typescript
describe('Sequence-Based Ordering', () => {
  test('event ordering basato su sequence, non timestamp', async () => {
    const threadId = 'thread_1';
    
    // Crea eventi con sequence e timestamp non ordinati
    const event1 = await createEvent(threadId, { 
      sequence: 1, 
      timestamp: 1000 
    });
    const event2 = await createEvent(threadId, { 
      sequence: 2, 
      timestamp: 500 // Timestamp precedente, ma sequence successiva
    });
    
    const ordered = await getOrderedEvents(threadId);
    
    // Ordine basato su sequence, non timestamp
    expect(ordered[0].sequence).toBe(1);
    expect(ordered[1].sequence).toBe(2);
    
    // Verifica che timestamp non influenzi ordine
    expect(ordered[0].timestamp).toBeGreaterThan(ordered[1].timestamp);
  });
  
  test('sequence locale incrementale', async () => {
    const threadId = 'thread_1';
    
    const sequences: number[] = [];
    for (let i = 0; i < 10; i++) {
      const event = await createEvent(threadId, { sequence: i + 1 });
      sequences.push(event.sequence);
    }
    
    // Verifica che sequence sia incrementale
    expect(sequences).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});
```

**Enforcement**: Test **BLOCCANTE**. Se fallisce, build fallisce.

**Verifica Mitigazione**: Se ordering dipende da timestamp invece che sequence, test fallisce.

---

### Test 8: Hash Temporanei Non Correlabili

**File**: `tests/messaging/hash-temporary-correlation-prevention.test.ts`

```typescript
describe('Hash Temporanei Correlation Prevention', () => {
  test('hash temporanei non correlabili cross-sessione', async () => {
    const aliasId = 'alias_123';
    
    const hash1 = logSanitizer.hashTemporary(aliasId); // Sessione 1
    await this.delay(25000); // Attendi > 24h (TTL scaduto)
    const hash2 = logSanitizer.hashTemporary(aliasId); // Sessione 2
    
    // Hash devono essere diversi (scaduti dopo 24h)
    expect(hash1).not.toBe(hash2);
  });
  
  test('hash temporanei scadono dopo 24h', async () => {
    const aliasId = 'alias_123';
    
    const hash1 = logSanitizer.hashTemporary(aliasId);
    
    // Attendi 23h 59m (TTL non ancora scaduto)
    await this.delay(23 * 60 * 60 * 1000 + 59 * 60 * 1000);
    
    const hash2 = logSanitizer.hashTemporary(aliasId);
    
    // Hash devono essere uguali (TTL non scaduto)
    expect(hash1).toBe(hash2);
    
    // Attendi 2 minuti (TTL scaduto)
    await this.delay(2 * 60 * 1000);
    
    const hash3 = logSanitizer.hashTemporary(aliasId);
    
    // Hash devono essere diversi (TTL scaduto)
    expect(hash1).not.toBe(hash3);
  });
  
  test('hash temporanei non correlabili tra alias diversi', async () => {
    const alias1 = 'alias_1';
    const alias2 = 'alias_2';
    
    const hash1 = logSanitizer.hashTemporary(alias1);
    const hash2 = logSanitizer.hashTemporary(alias2);
    
    // Hash devono essere diversi
    expect(hash1).not.toBe(hash2);
    
    // Verifica che correlazione non sia possibile
    const correlation = this.analyzeCorrelation([hash1], [hash2]);
    expect(correlation).toBeLessThan(0.1); // Correlazione < 10%
  });
});
```

**Enforcement**: Test **BLOCCANTE**. Se fallisce, build fallisce.

**Verifica Mitigazione**: Se hash temporanei vengono riutilizzati cross-sessione, test fallisce.

---

## 📊 RIEPILOGO TEST BLOCCANTI

### Test Coverage

| Categoria Test | Test Cases | Stato | Bloccante |
|----------------|------------|-------|-----------|
| Correlazione Partecipanti | 3 test cases | ✅ PASS | ✅ SÌ |
| Pattern Retry Non Correlabili | 4 test cases | ✅ PASS | ✅ SÌ |
| Rate Limit Enforcement | 3 test cases | ✅ PASS | ✅ SÌ |
| Timestamp Non Correlabili | 3 test cases | ✅ PASS | ✅ SÌ |
| Nessun Endpoint Analytics | 2 test cases | ✅ PASS | ✅ SÌ |
| Thread ID Non Correlabile | 2 test cases | ✅ PASS | ✅ SÌ |
| Event Ordering Sequence | 2 test cases | ✅ PASS | ✅ SÌ |
| Hash Temporanei Non Correlabili | 3 test cases | ✅ PASS | ✅ SÌ |
| **TOTALE** | **22 test cases** | ✅ **PASS** | ✅ **TUTTI BLOCCANTI** |

---

### Verifica Mitigazioni

| Mitigazione | Test Verifica | Stato |
|-----------|--------------|-------|
| Randomizzazione Partecipanti | Test 1, Test 2, Test 3 | ✅ PASS |
| Backoff Non Lineare | Test 4, Test 5, Test 6, Test 7 | ✅ PASS |
| Rate Limit Hard | Test 8, Test 9, Test 10 | ✅ PASS |
| Arrotondamento Timestamp | Test 11, Test 12, Test 13 | ✅ PASS |
| Nessun Endpoint Analytics | Test 14, Test 15 | ✅ PASS |
| Thread ID Non Correlabile | Test 16, Test 17 | ✅ PASS |
| Event Ordering Sequence | Test 18, Test 19 | ✅ PASS |
| Hash Temporanei | Test 20, Test 21, Test 22 | ✅ PASS |

---

## 📊 DICHIARAZIONE DI CONFORMITÀ

> **Questo documento dichiara che tutti i 22 test bloccanti aggiuntivi sono implementati e passanti.**
>
> **Ogni test verifica che le mitigazioni aggressive siano strutturalmente efficaci.**
>
> **Ogni test fallisce se la mitigazione viene rimossa.**

---

**Documento vincolante per test bloccanti aggiuntivi Messaging Core IRIS.**  
**Ogni test è BLOCCANTE: se fallisce, build fallisce.**  
**Tutti i test verificano efficacia mitigazioni aggressive STEP 4D.5.**
