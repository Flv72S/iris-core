#!/usr/bin/env node
/**
 * Preview Health Check Script
 * 
 * Script di verifica health e readiness per ambiente preview.
 * 
 * Responsabilità ESCLUSIVE:
 * - Verificare /health endpoint
 * - Verificare /ready endpoint
 * - Validare risposte corrette
 * 
 * Vincoli:
 * - Nessuna logica applicativa
 * - Solo verifica HTTP
 * 
 * Riferimenti vincolanti:
 * - IRIS_STEP6A_Deployment_Preview_Map.md
 */

/**
 * Verifica endpoint health
 */
async function checkHealth(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/health`);
    if (!response.ok) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        service: 'iris-api',
        component: 'health-check',
        correlationId: 'preview-check',
        message: 'Health check failed',
        context: { status: response.status, statusText: response.statusText },
      }));
      return false;
    }

    const data = await response.json();
    if (data.status !== 'ok') {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        service: 'iris-api',
        component: 'health-check',
        correlationId: 'preview-check',
        message: 'Health check returned invalid status',
        context: { data },
      }));
      return false;
    }

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      service: 'iris-api',
      component: 'health-check',
      correlationId: 'preview-check',
      message: 'Health check passed',
      context: { data },
    }));

    return true;
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      service: 'iris-api',
      component: 'health-check',
      correlationId: 'preview-check',
      message: 'Health check error',
      context: {
        error: error instanceof Error ? error.message : String(error),
      },
    }));
    return false;
  }
}

/**
 * Verifica endpoint readiness
 */
async function checkReadiness(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/ready`);
    
    // Readiness può essere 200 (ready) o 503 (not ready)
    const data = await response.json();
    
    if (response.status === 200 && data.status === 'ready') {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        service: 'iris-api',
        component: 'readiness-check',
        correlationId: 'preview-check',
        message: 'Readiness check passed',
        context: { data },
      }));
      return true;
    } else if (response.status === 503 && data.status === 'not ready') {
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        service: 'iris-api',
        component: 'readiness-check',
        correlationId: 'preview-check',
        message: 'Readiness check: not ready',
        context: { data },
      }));
      return false;
    } else {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        service: 'iris-api',
        component: 'readiness-check',
        correlationId: 'preview-check',
        message: 'Readiness check returned unexpected response',
        context: { status: response.status, data },
      }));
      return false;
    }
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      service: 'iris-api',
      component: 'readiness-check',
      correlationId: 'preview-check',
      message: 'Readiness check error',
      context: {
        error: error instanceof Error ? error.message : String(error),
      },
    }));
    return false;
  }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  const baseUrl = process.env.HEALTH_CHECK_URL || 'http://localhost:3000';
  const maxRetries = parseInt(process.env.HEALTH_CHECK_RETRIES || '5', 10);
  const retryDelay = parseInt(process.env.HEALTH_CHECK_RETRY_DELAY || '2000', 10);

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    service: 'iris-api',
    component: 'health-check',
    correlationId: 'preview-check',
    message: 'Starting health and readiness checks',
    context: { baseUrl, maxRetries, retryDelay },
  }));

  // Verifica health
  let healthOk = false;
  for (let i = 0; i < maxRetries; i++) {
    healthOk = await checkHealth(baseUrl);
    if (healthOk) break;
    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  if (!healthOk) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      service: 'iris-api',
      component: 'health-check',
      correlationId: 'preview-check',
      message: 'Health check failed after retries',
    }));
    process.exit(1);
  }

  // Verifica readiness
  let readinessOk = false;
  for (let i = 0; i < maxRetries; i++) {
    readinessOk = await checkReadiness(baseUrl);
    if (readinessOk) break;
    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  if (!readinessOk) {
    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'warn',
      service: 'iris-api',
      component: 'readiness-check',
      correlationId: 'preview-check',
      message: 'Readiness check failed after retries (system may still be starting)',
    }));
    // Readiness può fallire durante startup, non è bloccante
  }

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    service: 'iris-api',
    component: 'health-check',
    correlationId: 'preview-check',
    message: 'Health and readiness checks completed',
    context: { healthOk, readinessOk },
  }));

  process.exit(readinessOk ? 0 : 1);
}

// Esegue solo se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      service: 'iris-api',
      component: 'health-check',
      correlationId: 'preview-check-fatal',
      message: 'Unhandled error in health check',
      context: {
        error: error instanceof Error ? error.message : String(error),
      },
    }));
    process.exit(1);
  });
}
