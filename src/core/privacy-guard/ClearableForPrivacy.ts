/**
 * Privacy Guard — cancellazione immediata (6.2.3)
 *
 * Interfaccia per componenti che conservano dati comportamentali shadow
 * e supportano la cancellazione totale per privacy.
 * Nessun evento di dominio è toccato.
 */

export interface ClearableForPrivacy {
  clearForPrivacy(): void;
}
