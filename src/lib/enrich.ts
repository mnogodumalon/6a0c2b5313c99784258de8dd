import type { EnrichedBestellungen } from '@/types/enriched';
import type { Bestellungen, Speisen, Tische } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface BestellungenMaps {
  tischeMap: Map<string, Tische>;
  speisenMap: Map<string, Speisen>;
}

export function enrichBestellungen(
  bestellungen: Bestellungen[],
  maps: BestellungenMaps
): EnrichedBestellungen[] {
  return bestellungen.map(r => ({
    ...r,
    tischName: resolveDisplay(r.fields.tisch, maps.tischeMap, 'tischnummer'),
    positionenName: resolveDisplay(r.fields.positionen, maps.speisenMap, 'name'),
  }));
}
