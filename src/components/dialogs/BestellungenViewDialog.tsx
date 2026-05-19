import type { Bestellungen, Tische, Speisen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface BestellungenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Bestellungen | null;
  onEdit: (record: Bestellungen) => void;
  tischeList: Tische[];
  speisenList: Speisen[];
}

export function BestellungenViewDialog({ open, onClose, record, onEdit, tischeList, speisenList }: BestellungenViewDialogProps) {
  function getTischeDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return tischeList.find(r => r.record_id === id)?.fields.tischnummer ?? '—';
  }

  function getSpeisenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return speisenList.find(r => r.record_id === id)?.fields.name ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bestellungen anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tisch</Label>
            <p className="text-sm">{getTischeDisplayName(record.fields.tisch)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Positionen (Speisen)</Label>
            <p className="text-sm">{getSpeisenDisplayName(record.fields.positionen)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bestellzeit</Label>
            <p className="text-sm">{formatDate(record.fields.bestellzeit)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Trinkgeld (€)</Label>
            <p className="text-sm">{record.fields.trinkgeld ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gesamtbetrag (€)</Label>
            <p className="text-sm">{record.fields.gesamt ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bezahlt</Label>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              record.fields.bezahlt ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              {record.fields.bezahlt ? 'Ja' : 'Nein'}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}