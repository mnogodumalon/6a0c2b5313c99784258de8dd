import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichBestellungen } from '@/lib/enrich';
import type { EnrichedBestellungen } from '@/types/enriched';
import type { Tische, Bestellungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { BestellungenDialog } from '@/components/dialogs/BestellungenDialog';
import { TischeDialog } from '@/components/dialogs/TischeDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import {
  IconAlertCircle,
  IconTool,
  IconRefresh,
  IconCheck,
  IconPlus,
  IconPencil,
  IconTrash,
  IconReceipt,
  IconClock,
  IconCurrencyEuro,
  IconUsers,
  IconTable,
  IconShoppingCart,
} from '@tabler/icons-react';

const APPGROUP_ID = '6a0c2b5313c99784258de8dd';
const REPAIR_ENDPOINT = '/claude/build/repair';

export default function DashboardOverview() {
  const {
    speisen, tische, bestellungen,
    speisenMap, tischeMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedBestellungen = enrichBestellungen(bestellungen, { tischeMap, speisenMap });

  // --- State (must be BEFORE early returns) ---
  const [bestellungDialogOpen, setBestellungDialogOpen] = useState(false);
  const [bestellungEdit, setBestellungEdit] = useState<EnrichedBestellungen | null>(null);
  const [tischDialogOpen, setTischDialogOpen] = useState(false);
  const [tischEdit, setTischEdit] = useState<Tische | null>(null);
  const [deleteBestellung, setDeleteBestellung] = useState<EnrichedBestellungen | null>(null);
  const [deleteTisch, setDeleteTisch] = useState<Tische | null>(null);
  const [selectedTischId, setSelectedTischId] = useState<string | null>(null);

  // KPI stats
  const offeneBestellungen = useMemo(
    () => enrichedBestellungen.filter(b => !b.fields.bezahlt),
    [enrichedBestellungen]
  );
  const tagesumsatz = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return bestellungen
      .filter(b => b.fields.bestellzeit?.slice(0, 10) === today)
      .reduce((sum, b) => sum + (b.fields.gesamt ?? 0), 0);
  }, [bestellungen]);

  // Bestellungen per Tisch-Map
  const bestellungenByTisch = useMemo(() => {
    const map = new Map<string, EnrichedBestellungen[]>();
    enrichedBestellungen.forEach(b => {
      const id = b.fields.tisch ? b.fields.tisch.match(/([a-f0-9]{24})$/i)?.[1] : null;
      if (id) {
        if (!map.has(id)) map.set(id, []);
        map.get(id)!.push(b);
      }
    });
    return map;
  }, [enrichedBestellungen]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const selectedTischBestellungen = selectedTischId
    ? (bestellungenByTisch.get(selectedTischId) ?? [])
    : [];

  const handleCreateBestellung = async (fields: Bestellungen['fields']) => {
    await LivingAppsService.createBestellungenEntry(fields);
    fetchAll();
  };

  const handleUpdateBestellung = async (fields: Bestellungen['fields']) => {
    if (!bestellungEdit) return;
    await LivingAppsService.updateBestellungenEntry(bestellungEdit.record_id, fields);
    fetchAll();
  };

  const handleDeleteBestellung = async () => {
    if (!deleteBestellung) return;
    await LivingAppsService.deleteBestellungenEntry(deleteBestellung.record_id);
    setDeleteBestellung(null);
    fetchAll();
  };

  const handleCreateTisch = async (fields: Tische['fields']) => {
    await LivingAppsService.createTischeEntry(fields);
    fetchAll();
  };

  const handleUpdateTisch = async (fields: Tische['fields']) => {
    if (!tischEdit) return;
    await LivingAppsService.updateTischeEntry(tischEdit.record_id, fields);
    fetchAll();
  };

  const handleDeleteTisch = async () => {
    if (!deleteTisch) return;
    await LivingAppsService.deleteTischeEntry(deleteTisch.record_id);
    if (selectedTischId === deleteTisch.record_id) setSelectedTischId(null);
    setDeleteTisch(null);
    fetchAll();
  };

  const handleMarkBezahlt = async (b: EnrichedBestellungen) => {
    await LivingAppsService.updateBestellungenEntry(b.record_id, { bezahlt: !b.fields.bezahlt });
    fetchAll();
  };

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Tische gesamt"
          value={String(tische.length)}
          description="Registriert"
          icon={<IconTable size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Offene Bestellungen"
          value={String(offeneBestellungen.length)}
          description="Noch nicht bezahlt"
          icon={<IconShoppingCart size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Bestellungen heute"
          value={String(bestellungen.filter(b => b.fields.bestellzeit?.slice(0, 10) === new Date().toISOString().slice(0, 10)).length)}
          description="Heute aufgegeben"
          icon={<IconReceipt size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Umsatz heute"
          value={formatCurrency(tagesumsatz)}
          description="Gesamtbetrag"
          icon={<IconCurrencyEuro size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Main workspace: Tisch-Grid + Bestellungen-Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Tisch-Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold">Tischübersicht</h2>
            <Button
              size="sm"
              onClick={() => { setTischEdit(null); setTischDialogOpen(true); }}
            >
              <IconPlus size={16} className="mr-1 shrink-0" />
              <span className="hidden sm:inline">Tisch anlegen</span>
              <span className="sm:hidden">Tisch</span>
            </Button>
          </div>

          {tische.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl border border-dashed border-border">
              <IconTable size={48} className="text-muted-foreground" stroke={1.5} />
              <p className="text-sm text-muted-foreground">Noch keine Tische angelegt</p>
              <Button size="sm" variant="outline" onClick={() => { setTischEdit(null); setTischDialogOpen(true); }}>
                <IconPlus size={14} className="mr-1" /> Ersten Tisch anlegen
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {tische.map(tisch => {
                const bestellList = bestellungenByTisch.get(tisch.record_id) ?? [];
                const offene = bestellList.filter(b => !b.fields.bezahlt);
                const isSelected = selectedTischId === tisch.record_id;
                const tischUmsatz = bestellList.reduce((s, b) => s + (b.fields.gesamt ?? 0), 0);

                return (
                  <div
                    key={tisch.record_id}
                    onClick={() => setSelectedTischId(isSelected ? null : tisch.record_id)}
                    className={`
                      relative rounded-2xl border p-4 cursor-pointer transition-all overflow-hidden
                      ${isSelected
                        ? 'border-primary bg-primary/5 shadow-md'
                        : offene.length > 0
                          ? 'border-orange-300 bg-orange-50 hover:border-orange-400'
                          : 'border-border bg-card hover:border-primary/40 hover:bg-accent/30'
                      }
                    `}
                  >
                    {/* Status dot */}
                    <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${offene.length > 0 ? 'bg-orange-400' : 'bg-green-400'}`} />

                    <div className="min-w-0">
                      <p className="font-bold text-base truncate">{tisch.fields.tischnummer ?? '—'}</p>
                      {tisch.fields.bemerkung && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{tisch.fields.bemerkung}</p>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      {offene.length > 0 ? (
                        <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 border-orange-200">
                          {offene.length} offen
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-200">
                          Frei
                        </Badge>
                      )}
                      {tischUmsatz > 0 && (
                        <span className="text-xs text-muted-foreground font-medium">{formatCurrency(tischUmsatz)}</span>
                      )}
                    </div>

                    {/* Edit / Delete actions */}
                    <div className="mt-3 flex gap-1.5" onClick={e => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => { setTischEdit(tisch); setTischDialogOpen(true); }}
                      >
                        <IconPencil size={14} className="shrink-0" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTisch(tisch)}
                      >
                        <IconTrash size={14} className="shrink-0" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Bestellungen für gewählten Tisch */}
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold">
              {selectedTischId
                ? `Bestellungen – ${tischeMap.get(selectedTischId)?.fields.tischnummer ?? 'Tisch'}`
                : 'Bestellungen'}
            </h2>
            <Button
              size="sm"
              onClick={() => { setBestellungEdit(null); setBestellungDialogOpen(true); }}
              disabled={!selectedTischId}
              title={!selectedTischId ? 'Bitte zuerst einen Tisch auswählen' : ''}
            >
              <IconPlus size={16} className="mr-1 shrink-0" />
              <span className="hidden sm:inline">Neue Bestellung</span>
              <span className="sm:hidden">Neu</span>
            </Button>
          </div>

          {!selectedTischId ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl border border-dashed border-border">
              <IconUsers size={40} className="text-muted-foreground" stroke={1.5} />
              <p className="text-sm text-muted-foreground text-center">Tisch auswählen um<br />Bestellungen zu sehen</p>
            </div>
          ) : selectedTischBestellungen.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl border border-dashed border-border">
              <IconShoppingCart size={40} className="text-muted-foreground" stroke={1.5} />
              <p className="text-sm text-muted-foreground">Noch keine Bestellungen</p>
              <Button size="sm" variant="outline" onClick={() => { setBestellungEdit(null); setBestellungDialogOpen(true); }}>
                <IconPlus size={14} className="mr-1" /> Bestellung anlegen
              </Button>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-20rem)]">
              {selectedTischBestellungen.map(b => (
                <div
                  key={b.record_id}
                  className={`rounded-2xl border p-4 transition-colors overflow-hidden ${b.fields.bezahlt ? 'bg-muted/30 border-border opacity-70' : 'bg-card border-border'}`}
                >
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{b.positionenName || '(Keine Speise)'}</p>
                      {b.fields.bestellzeit && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <IconClock size={12} className="shrink-0 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{formatDate(b.fields.bestellzeit)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {b.fields.gesamt != null && (
                        <span className="text-sm font-bold">{formatCurrency(b.fields.gesamt)}</span>
                      )}
                      {b.fields.trinkgeld ? (
                        <span className="text-xs text-muted-foreground">+{formatCurrency(b.fields.trinkgeld)} TG</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
                    <button
                      onClick={() => handleMarkBezahlt(b)}
                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                        b.fields.bezahlt
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                      }`}
                    >
                      {b.fields.bezahlt ? (
                        <><IconCheck size={12} className="shrink-0" /> Bezahlt</>
                      ) : (
                        <><IconCurrencyEuro size={12} className="shrink-0" /> Offen</>
                      )}
                    </button>

                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => { setBestellungEdit(b); setBestellungDialogOpen(true); }}
                      >
                        <IconPencil size={14} className="shrink-0" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-destructive hover:text-destructive"
                        onClick={() => setDeleteBestellung(b)}
                      >
                        <IconTrash size={14} className="shrink-0" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Tisch-Summe */}
              {selectedTischBestellungen.length > 0 && (
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Tischsumme</span>
                    <span className="text-base font-bold text-primary">
                      {formatCurrency(selectedTischBestellungen.reduce((s, b) => s + (b.fields.gesamt ?? 0), 0))}
                    </span>
                  </div>
                  {selectedTischBestellungen.some(b => b.fields.trinkgeld) && (
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">Trinkgeld</span>
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(selectedTischBestellungen.reduce((s, b) => s + (b.fields.trinkgeld ?? 0), 0))}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Alle offenen Bestellungen (kompakt, wenn kein Tisch gewählt) */}
      {!selectedTischId && offeneBestellungen.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Alle offenen Bestellungen</h2>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tisch</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Speise</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Zeit</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Betrag</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {offeneBestellungen.map(b => (
                  <tr key={b.record_id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium truncate max-w-[8rem]">{b.tischName || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground truncate max-w-[10rem]">{b.positionenName || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                      {b.fields.bestellzeit ? formatDate(b.fields.bestellzeit) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                      {b.fields.gesamt != null ? formatCurrency(b.fields.gesamt) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleMarkBezahlt(b)}>
                          <IconCheck size={14} className="shrink-0 text-green-600" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setBestellungEdit(b); setBestellungDialogOpen(true); }}>
                          <IconPencil size={14} className="shrink-0" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => setDeleteBestellung(b)}>
                          <IconTrash size={14} className="shrink-0" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bestellungen Dialog */}
      <BestellungenDialog
        open={bestellungDialogOpen}
        onClose={() => { setBestellungDialogOpen(false); setBestellungEdit(null); }}
        onSubmit={bestellungEdit ? handleUpdateBestellung : handleCreateBestellung}
        defaultValues={bestellungEdit
          ? bestellungEdit.fields
          : selectedTischId
            ? { tisch: createRecordUrl(APP_IDS.TISCHE, selectedTischId) }
            : undefined
        }
        speisenList={speisen}
        tischeList={tische}
        enablePhotoScan={AI_PHOTO_SCAN['Bestellungen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Bestellungen']}
      />

      {/* Tische Dialog */}
      <TischeDialog
        open={tischDialogOpen}
        onClose={() => { setTischDialogOpen(false); setTischEdit(null); }}
        onSubmit={tischEdit ? handleUpdateTisch : handleCreateTisch}
        defaultValues={tischEdit?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['Tische']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Tische']}
      />

      {/* Confirm: Bestellung löschen */}
      <ConfirmDialog
        open={!!deleteBestellung}
        title="Bestellung löschen"
        description={`Bestellung "${deleteBestellung?.positionenName || 'diese Bestellung'}" wirklich löschen?`}
        onConfirm={handleDeleteBestellung}
        onClose={() => setDeleteBestellung(null)}
      />

      {/* Confirm: Tisch löschen */}
      <ConfirmDialog
        open={!!deleteTisch}
        title="Tisch löschen"
        description={`Tisch "${deleteTisch?.fields.tischnummer || 'diesen Tisch'}" wirklich löschen?`}
        onConfirm={handleDeleteTisch}
        onClose={() => setDeleteTisch(null)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
