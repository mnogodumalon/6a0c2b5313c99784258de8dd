import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Speisen, Tische, Bestellungen } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [speisen, setSpeisen] = useState<Speisen[]>([]);
  const [tische, setTische] = useState<Tische[]>([]);
  const [bestellungen, setBestellungen] = useState<Bestellungen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [speisenData, tischeData, bestellungenData] = await Promise.all([
        LivingAppsService.getSpeisen(),
        LivingAppsService.getTische(),
        LivingAppsService.getBestellungen(),
      ]);
      setSpeisen(speisenData);
      setTische(tischeData);
      setBestellungen(bestellungenData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [speisenData, tischeData, bestellungenData] = await Promise.all([
          LivingAppsService.getSpeisen(),
          LivingAppsService.getTische(),
          LivingAppsService.getBestellungen(),
        ]);
        setSpeisen(speisenData);
        setTische(tischeData);
        setBestellungen(bestellungenData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const speisenMap = useMemo(() => {
    const m = new Map<string, Speisen>();
    speisen.forEach(r => m.set(r.record_id, r));
    return m;
  }, [speisen]);

  const tischeMap = useMemo(() => {
    const m = new Map<string, Tische>();
    tische.forEach(r => m.set(r.record_id, r));
    return m;
  }, [tische]);

  return { speisen, setSpeisen, tische, setTische, bestellungen, setBestellungen, loading, error, fetchAll, speisenMap, tischeMap };
}