/**
 * UI Error Boundary
 * 
 * STEP 5.3 — Error boundary neutra per UI
 * 
 * Riferimenti vincolanti:
 * - IRIS_UI_Semantic_Freeze_STEP5.1.5_v1.0.md
 * - IRIS_STEP5.3_Checklist_Bloccante.md
 * 
 * Vincoli:
 * - Nessun copy emozionale
 * - Nessun suggerimento
 * - Nessuna azione
 * - Messaggio neutro e dichiarativo
 */

import React, { Component, type ReactNode } from 'react';

/**
 * Props per UIErrorBoundary
 */
export interface UIErrorBoundaryProps {
  readonly children: ReactNode;
}

/**
 * Stato per UIErrorBoundary
 */
interface UIErrorBoundaryState {
  readonly hasError: boolean;
  readonly error: Error | null;
}

/**
 * UI Error Boundary
 * 
 * Error boundary neutra che mostra errori in modo dichiarativo.
 * Nessun copy emozionale, nessun suggerimento, nessuna azione.
 */
export class UIErrorBoundary extends Component<UIErrorBoundaryProps, UIErrorBoundaryState> {
  constructor(props: UIErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }
  
  static getDerivedStateFromError(error: Error): UIErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log errore (non UX, solo tecnico)
    // In produzione, questo verrebbe inviato a un servizio di logging
    // eslint-disable-next-line no-console
    console.error('UI Error Boundary catturato:', error, errorInfo);
  }
  
  render(): ReactNode {
    if (this.state.hasError) {
      // Messaggio neutro e dichiarativo (da vocabolario congelato)
      // Nessun copy emozionale, nessun suggerimento, nessuna azione
      return (
        <div data-testid="ui-error-boundary">
          <div data-testid="ui-error-message">
            Errore: {this.state.error?.message || 'Errore sconosciuto'}
          </div>
          <div data-testid="ui-error-state">
            Lo stato della UI non è coerente.
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}
