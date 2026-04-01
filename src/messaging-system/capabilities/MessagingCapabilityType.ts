/**
 * MessagingCapabilityType — C.4.A
 * Tassonomia dichiarativa delle capability operative. Nessun tipo implica esecuzione diretta.
 */

export const MESSAGING_CAPABILITY_TYPES = [
  'TEXT_SEND',
  'VOICE_SEND',
  'VOICE_TRANSCRIPTION',
  'AI_SUMMARY',
  'THREAD_SYNTHESIS',
  'SEMANTIC_SEARCH',
  'INBOX_PRIORITIZATION',
  'ANTI_GHOSTING_SIGNAL',
  'SOCIAL_COACH_SIGNAL',
  'DIGITAL_WELLBEING_GATE',
  'SECOND_BRAIN_INDEXING',
] as const;

export type MessagingCapabilityType = (typeof MESSAGING_CAPABILITY_TYPES)[number];
