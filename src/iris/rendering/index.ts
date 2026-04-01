/**
 * IRIS 9.3 — Rendering / UX Delivery
 * Consuma IrisMessageBinding[] (9.2); produce artefatti UX renderizzati.
 * Terminale, espressivo, UX-only. Nessuna decisione, nessun invio.
 */

export type { IrisRenderedContent } from './IrisRenderedContent';
export type { IrisRenderResult } from './IrisRenderResult';
export type { IrisRenderTemplate } from './IrisRenderTemplate';
export {
  IRIS_RENDERING_COMPONENT_ID,
  isRenderingEnabled,
  type RenderingRegistry,
} from './IrisRenderingKillSwitch';
export { IrisRenderingEngine } from './IrisRenderingEngine';
