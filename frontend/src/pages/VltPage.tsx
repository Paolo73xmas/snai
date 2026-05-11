import { useEffect, useState, useCallback } from 'react';
import { cashApi, useAuthStore } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { RefreshCw, Monitor } from 'lucide-react';

interface VltOption { id: number; codice: string; name: string; }
interface CashOption { id: number; name: string; saldo_teorico: number; status: string; }

function formatCurrency(v: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v);
}

export default function VltPage() {
  const { profile } = useAuthStore();
  const canAccess = profile?.ruolo === 'admin' || profile?.ruolo === 'operator_plus';

  const [vlts, setVlts] = useState<VltOption[]>([]);
  const [cashes, setCashes] = useState<CashOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const [vltId, setVltId] = useState('');
  const [importo, setImporto] = useState('');
  const [destCash, setDestCash] = useState('');
  const [note, setNote] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [v, c] = await Promise.all([
        cashApi<VltOption[]>('/all-vlts'),
        cashApi<CashOption[]>('/available-cashes'),
      ]);
      setVlts(v);
      setCashes(c);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async () => {
    if (!vltId || !importo || !destCash) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }
    setSubmitting(true);
    try {
      const res = await cashApi('/svuotamento-vlt', 'POST', {
        vlt_id: parseInt(vltId),
        importo: parseFloat(importo),
        dest_cash_id: parseInt(destCash),
        note,
      });
      if (res.success) {
        toast.success('Svuotamento VLT completato!');
        setVltId(''); setImporto(''); setDestCash(''); setNote('');
        fetchData();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || 'Errore svuotamento VLT');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Accesso non autorizzato</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
          <Monitor className="w-8 h-8 text-primary" />VLT
        </h1>
        <p className="text-muted-foreground mt-1">Gestione svuotamento macchine VLT</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* VLT List */}
          <Card className="material-surface">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Macchine VLT Attive</CardTitle>
            </CardHeader>
            <CardContent>
              {vlts.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nessuna VLT configurata</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {vlts.map((v) => (
                    <div key={v.id} className="p-3 rounded-2xl bg-muted/50 border border-border/50">
                      <p className="font-medium text-sm">{v.name}</p>
                      <p className="text-xs text-muted-foreground">Codice: {v.codice}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Svuotamento Form */}
          <Card className="material-surface">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Svuotamento VLT</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">VLT</Label>
                  <Select value={vltId} onValueChange={setVltId}>
                    <SelectTrigger className="rounded-2xl h-11"><SelectValue placeholder="Seleziona VLT" /></SelectTrigger>
                    <SelectContent>
                      {vlts.map((v) => (
                        <SelectItem key={v.id} value={v.id.toString()}>{v.name} ({v.codice})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Importo (€)</Label>
                  <Input type="number" step="0.01" min="0.01" value={importo} onChange={(e) => setImporto(e.target.value)} className="rounded-2xl h-11" placeholder="0.00" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Cassa Destinazione</Label>
                  <Select value={destCash} onValueChange={setDestCash}>
                    <SelectTrigger className="rounded-2xl h-11"><SelectValue placeholder="Seleziona" /></SelectTrigger>
                    <SelectContent>
                      {cashes.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.name} ({formatCurrency(c.saldo_teorico)})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note..." className="rounded-2xl resize-none" rows={2} />
              <Button disabled={submitting} className="w-full rounded-2xl" onClick={handleSubmit}>
                {submitting && <RefreshCw className="w-4 h-4 animate-spin mr-2" />}Esegui Svuotamento VLT
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}