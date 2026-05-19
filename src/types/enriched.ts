import type { Bestellungen } from './app';

export type EnrichedBestellungen = Bestellungen & {
  tischName: string;
  positionenName: string;
};
