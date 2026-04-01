/**
 * Deployment Preview Tests
 * 
 * Test bloccanti per verifica deployment preview.
 * 
 * Riferimenti vincolanti:
 * - IRIS_STEP6A_Deployment_Preview_Map.md
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..', '..');

describe('Deployment Preview', () => {
  describe('Environment files', () => {
    it('deve esistere .env.example', () => {
      const envExample = join(projectRoot, '.env.example');
      expect(existsSync(envExample)).toBe(true);
    });

    it('deve esistere .env.preview.example', () => {
      const envPreviewExample = join(projectRoot, '.env.preview.example');
      expect(existsSync(envPreviewExample)).toBe(true);
    });

    it('.env.example deve contenere variabili richieste', () => {
      const envExample = join(projectRoot, '.env.example');
      const content = readFileSync(envExample, 'utf-8');
      
      expect(content).toContain('HTTP_PORT');
      expect(content).toContain('PERSISTENCE');
      expect(content).toContain('LOG_LEVEL');
      expect(content).toContain('SHUTDOWN_TIMEOUT_MS');
    });

    it('.env.preview.example deve contenere variabili richieste', () => {
      const envPreviewExample = join(projectRoot, '.env.preview.example');
      const content = readFileSync(envPreviewExample, 'utf-8');
      
      expect(content).toContain('HTTP_PORT');
      expect(content).toContain('PERSISTENCE');
      expect(content).toContain('LOG_LEVEL');
      expect(content).toContain('SHUTDOWN_TIMEOUT_MS');
    });
  });

  describe('Docker files', () => {
    it('deve esistere Dockerfile.preview', () => {
      const dockerfile = join(projectRoot, 'Dockerfile.preview');
      expect(existsSync(dockerfile)).toBe(true);
    });

    it('deve esistere docker-compose.preview.yml', () => {
      const dockerCompose = join(projectRoot, 'docker-compose.preview.yml');
      expect(existsSync(dockerCompose)).toBe(true);
    });

    it('Dockerfile.preview deve usare Node LTS', () => {
      const dockerfile = join(projectRoot, 'Dockerfile.preview');
      const content = readFileSync(dockerfile, 'utf-8');
      
      expect(content).toMatch(/FROM node:\d+-alpine/);
    });

    it('Dockerfile.preview deve esporre porta 3000', () => {
      const dockerfile = join(projectRoot, 'Dockerfile.preview');
      const content = readFileSync(dockerfile, 'utf-8');
      
      expect(content).toContain('EXPOSE 3000');
    });

    it('Dockerfile.preview deve avere healthcheck', () => {
      const dockerfile = join(projectRoot, 'Dockerfile.preview');
      const content = readFileSync(dockerfile, 'utf-8');
      
      expect(content).toContain('HEALTHCHECK');
      expect(content).toContain('/health');
    });
  });

  describe('Startup scripts', () => {
    it('deve esistere scripts/start-preview.ts', () => {
      const startScript = join(projectRoot, 'scripts', 'start-preview.ts');
      expect(existsSync(startScript)).toBe(true);
    });

    it('deve esistere scripts/check-preview.ts', () => {
      const checkScript = join(projectRoot, 'scripts', 'check-preview.ts');
      expect(existsSync(checkScript)).toBe(true);
    });

    it('start-preview.ts deve validare env minime', () => {
      const startScript = join(projectRoot, 'scripts', 'start-preview.ts');
      const content = readFileSync(startScript, 'utf-8');
      
      expect(content).toContain('validateMinimalEnv');
      expect(content).toContain('HTTP_PORT');
    });

    it('check-preview.ts deve verificare /health', () => {
      const checkScript = join(projectRoot, 'scripts', 'check-preview.ts');
      const content = readFileSync(checkScript, 'utf-8');
      
      expect(content).toContain('/health');
      expect(content).toContain('checkHealth');
    });

    it('check-preview.ts deve verificare /ready', () => {
      const checkScript = join(projectRoot, 'scripts', 'check-preview.ts');
      const content = readFileSync(checkScript, 'utf-8');
      
      expect(content).toContain('/ready');
      expect(content).toContain('checkReadiness');
    });
  });

  describe('Documentation', () => {
    it('deve esistere docs/PREVIEW_OBSERVABILITY_EXAMPLES.md', () => {
      const doc = join(projectRoot, 'docs', 'PREVIEW_OBSERVABILITY_EXAMPLES.md');
      expect(existsSync(doc)).toBe(true);
    });

    it('deve esistere docs/PREVIEW_ROLLBACK_FAILURE_MODES.md', () => {
      const doc = join(projectRoot, 'docs', 'PREVIEW_ROLLBACK_FAILURE_MODES.md');
      expect(existsSync(doc)).toBe(true);
    });
  });
});
