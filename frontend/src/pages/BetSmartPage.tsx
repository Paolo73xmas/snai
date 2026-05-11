import { useEffect, useState, useCallback } from 'react';
import { cashApi, useAuthStore } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { RefreshCw, Tv } from 'lucide-react';

interface BsOption { id: number; codice: string; name: string; }
interface CashOption { id: number; name: string; saldo_teorico: number; status: string; }

function formatCurrency(v: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v);
}

export default function BetSmartPage() {
  const { profile } = useAuthStore();
  const canAccess = profile?.ruolo === 'admin' || profile?.ruolo === 'operator_plus';

  const [betsmarts, setBetsmarts] = useState<BsOption[]>([]);
  const [cashes, setCashes] = useState<CashOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const [bsId, setBsId] = useState('');
  const [importo, setImporto] = useState('');
  const [destCash, setDestCash] = useState('');
  const [note, setNote] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [b, c] = await Promise.all([
        cashApi<BsOption[]>('/all-betsmarts'),
        cashApi<CashOption[]>('/available-cashes'),
      ]);
      setBetsmarts(b);
      setCashes(c);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async () => {
    if (!bsId || !importo || !destCash) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }
    setSubmitting(true);
    try {
      const res = await cashApi('/svuotamento-betsmart', 'POST', {
        betsmart_id: parseInt(bsId),
        importo: parseFloat(importo),
        dest_cash_id: parseInt(destCash),
        note,
      });
      if (res.success) {
        toast.success('Svuotamento BetSmart completato!');
        setBsId(''); setImporto(''); setDestCash(''); setNote('');
        fetchData();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || 'Errore svuotamento BetSmart');
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
          <Tv className="w-8 h-8 text-primary" />BetSmart
        </h1>
        <p className="text-muted-foreground mt-1">Gestione svuotamento terminali BetSmart</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* BetSmart List */}
          <Card className="material-surface">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Terminali BetSmart Attivi</CardTitle>
            </CardHeader>
            <CardContent>
              {betsmarts.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nessun terminale BetSmart configurato</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {betsmarts.map((b) => (
                    <div key={b.id} className="p-3 rounded-2xl bg-muted/50 border border-border/50">
                      <p className="font-medium text-sm">{b.name}</p>
                      <p className="text-xs text-muted-foreground">Codice: {b.codice}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Svuotamento Form */}
          <Card className="material-surface">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Svuotamento BetSmart</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">BetSmart</Label>
                  <Select value={bsId} onValueChange={setBsId}>
                    <SelectTrigger className="rounded-2xl h-11"><SelectValue placeholder="Seleziona" /></SelectTrigger>
                    <SelectContent>
                      {betsmarts.map((b) => (
                        <SelectItem key={b.id} value={b.id.toString()}>{b.name} ({b.codice})</SelectItem>
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
                {submitting && <RefreshCw className="w-4 h-4 animate-spin mr-2" />}Esegui Svuotamento BetSmart
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}