import { useEffect, useState, useCallback } from 'react';
import { cashApi, useAuthStore } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Play,
  Square,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Wallet,
  ArrowLeftRight,
  Clock,
} from 'lucide-react';

interface ShiftData {
  id?: number;
  active?: boolean;
  cash_id?: number;
  cash_name?: string;
  opened_at?: string;
  saldo_teorico_apertura?: number;
  saldo_fisico_apertura?: number;
  discrepanza_apertura?: number;
  saldo_teorico_corrente?: number;
  totale_incassi?: number;
  totale_pagamenti?: number;
  totale_sovvenzioni?: number;
  totale_restituzioni?: number;
  totale_svuotamenti?: number;
  status?: string;
}

interface CashOption {
  id: number;
  name: string;
  saldo_teorico: number;
  status: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
}

export default function OperatorPage() {
  const { profile } = useAuthStore();
  const [shift, setShift] = useState<ShiftData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cashes, setCashes] = useState<CashOption[]>([]);

  // Open shift form
  const [selectedCash, setSelectedCash] = useState('');
  const [saldoFisico, setSaldoFisico] = useState('');
  const [openNote, setOpenNote] = useState('');
  const [opening, setOpening] = useState(false);

  // Close shift form
  const [closeSaldoFisico, setCloseSaldoFisico] = useState('');
  const [closeNote, setCloseNote] = useState('');
  const [closing, setClosing] = useState(false);

  // Income/Payment form
  const [opType, setOpType] = useState<'income' | 'payment'>('income');
  const [opCategoria, setOpCategoria] = useState('');
  const [opImporto, setOpImporto] = useState('');
  const [opNote, setOpNote] = useState('');
  const [recording, setRecording] = useState(false);

  const fetchShift = useCallback(async () => {
    try {
      const res = await cashApi<ShiftData>('/my-shift');
      setShift(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCashes = useCallback(async () => {
    try {
      const res = await cashApi<CashOption[]>('/available-cashes');
      setCashes(res);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchShift();
    fetchCashes();
    const interval = setInterval(fetchShift, 15000);
    return () => clearInterval(interval);
  }, [fetchShift, fetchCashes]);

  const handleOpenShift = async () => {
    if (!selectedCash || !saldoFisico) {
      toast.error('Seleziona una cassa e inserisci il saldo fisico');
      return;
    }
    setOpening(true);
    try {
      const res = await cashApi('/open-shift', 'POST', {
        cash_id: parseInt(selectedCash),
        saldo_fisico: parseFloat(saldoFisico),
        note: openNote,
      });
      if (res.success) {
        toast.success('Turno aperto con successo!');
        if (res.discrepanza !== 0) {
          toast.warning(`Discrepanza rilevata: ${formatCurrency(res.discrepanza)}`);
        }
        setSelectedCash('');
        setSaldoFisico('');
        setOpenNote('');
        fetchShift();
        fetchCashes();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || 'Errore apertura turno');
    } finally {
      setOpening(false);
    }
  };

  const handleCloseShift = async () => {
    if (!closeSaldoFisico) {
      toast.error('Inserisci il saldo fisico');
      return;
    }
    setClosing(true);
    try {
      const res = await cashApi('/close-shift', 'POST', {
        saldo_fisico: parseFloat(closeSaldoFisico),
        note: closeNote,
      });
      if (res.success) {
        toast.success('Turno chiuso con successo!');
        if (res.discrepanza !== 0) {
          toast.warning(`Discrepanza: ${formatCurrency(res.discrepanza)}`);
        }
        setCloseSaldoFisico('');
        setCloseNote('');
        fetchShift();
        fetchCashes();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || 'Errore chiusura turno');
    } finally {
      setClosing(false);
    }
  };

  const handleRecordOp = async () => {
    if (!opCategoria || !opImporto) {
      toast.error('Compila tutti i campi');
      return;
    }
    setRecording(true);
    try {
      const endpoint = opType === 'income' ? '/record-income' : '/record-payment';
      const res = await cashApi(endpoint, 'POST', {
        categoria: opCategoria,
        importo: parseFloat(opImporto),
        note: opNote,
      });
      if (res.success) {
        toast.success(`${opType === 'income' ? 'Incasso' : 'Pagamento'} registrato!`);
        setOpCategoria('');
        setOpImporto('');
        setOpNote('');
        fetchShift();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || 'Errore registrazione');
    } finally {
      setRecording(false);
    }
  };

  const incomeCategories = [
    { value: 'scommesse_sportive', label: 'Scommesse Sportive' },
    { value: 'scommesse_ippiche', label: 'Scommesse Ippiche' },
    { value: 'scommesse_virtuali', label: 'Scommesse Virtuali' },
    { value: 'ricariche', label: 'Ricariche' },
  ];

  const paymentCategories = [
    { value: 'scommesse_sportive', label: 'Scommesse Sportive' },
    { value: 'scommesse_ippiche', label: 'Scommesse Ippiche' },
    { value: 'scommesse_virtuali', label: 'Scommesse Virtuali' },
    { value: 'vlt', label: 'VLT' },
    { value: 'prelievi_web', label: 'Prelievi Web' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasActiveShift = shift && shift.id && shift.status === 'aperto';

  return (
    <div className="space-y-6 fade-in max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Il Mio Turno</h1>
          <p className="text-muted-foreground mt-1">
            {profile ? `${profile.nome || ''} ${profile.cognome || ''}`.trim() || profile.username : 'Operatore'}
          </p>
        </div>
        <Button onClick={() => { fetchShift(); fetchCashes(); }} variant="outline" className="rounded-2xl gap-2">
          <RefreshCw className="w-4 h-4" />
          Aggiorna
        </Button>
      </div>

      {hasActiveShift ? (
        <>
          {/* Shift Summary */}
          <Card className="material-surface-elevated border-0 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Turno in Corso
                </CardTitle>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0 rounded-full">
                  {shift.cash_name}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-2">
                <div className="text-center p-3 rounded-2xl bg-white/50 dark:bg-white/5">
                  <Wallet className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Saldo Corrente</p>
                  <p className="font-bold text-lg">{formatCurrency(shift.saldo_teorico_corrente || 0)}</p>
                </div>
                <div className="text-center p-3 rounded-2xl bg-white/50 dark:bg-white/5">
                  <TrendingUp className="w-5 h-5 text-green-600 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Incassi</p>
                  <p className="font-bold text-green-600">{formatCurrency(shift.totale_incassi || 0)}</p>
                </div>
                <div className="text-center p-3 rounded-2xl bg-white/50 dark:bg-white/5">
                  <TrendingDown className="w-5 h-5 text-red-600 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Pagamenti</p>
                  <p className="font-bold text-red-600">{formatCurrency(shift.totale_pagamenti || 0)}</p>
                </div>
                <div className="text-center p-3 rounded-2xl bg-white/50 dark:bg-white/5">
                  <ArrowLeftRight className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Sovvenzioni</p>
                  <p className="font-bold text-blue-600">{formatCurrency(shift.totale_sovvenzioni || 0)}</p>
                </div>
                <div className="text-center p-3 rounded-2xl bg-white/50 dark:bg-white/5">
                  <ArrowLeftRight className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Restituzioni</p>
                  <p className="font-bold text-orange-600">{formatCurrency(shift.totale_restituzioni || 0)}</p>
                </div>
                <div className="text-center p-3 rounded-2xl bg-white/50 dark:bg-white/5">
                  <ArrowLeftRight className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Svuotamenti</p>
                  <p className="font-bold text-purple-600">{formatCurrency(shift.totale_svuotamenti || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Income / Payment */}
          <Card className="material-surface">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Registra Operazione</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={opType === 'income' ? 'default' : 'outline'}
                  className="flex-1 rounded-2xl gap-2"
                  onClick={() => { setOpType('income'); setOpCategoria(''); }}
                >
                  <TrendingUp className="w-4 h-4" />
                  Incasso
                </Button>
                <Button
                  variant={opType === 'payment' ? 'default' : 'outline'}
                  className="flex-1 rounded-2xl gap-2"
                  onClick={() => { setOpType('payment'); setOpCategoria(''); }}
                >
                  <TrendingDown className="w-4 h-4" />
                  Pagamento
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={opCategoria} onValueChange={setOpCategoria}>
                    <SelectTrigger className="rounded-2xl h-12">
                      <SelectValue placeholder="Seleziona categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {(opType === 'income' ? incomeCategories : paymentCategories).map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Importo (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={opImporto}
                    onChange={(e) => setOpImporto(e.target.value)}
                    placeholder="0.00"
                    className="rounded-2xl h-12"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Note (opzionale)</Label>
                <Textarea
                  value={opNote}
                  onChange={(e) => setOpNote(e.target.value)}
                  placeholder="Note aggiuntive..."
                  className="rounded-2xl resize-none"
                  rows={2}
                />
              </div>
              <Button
                onClick={handleRecordOp}
                disabled={recording}
                className="w-full material-button"
              >
                {recording ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                Registra {opType === 'income' ? 'Incasso' : 'Pagamento'}
              </Button>
            </CardContent>
          </Card>

          {/* Close Shift */}
          <Card className="material-surface border-amber-200 dark:border-amber-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Square className="w-5 h-5" />
                Chiudi Turno
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Saldo teorico corrente: <strong>{formatCurrency(shift.saldo_teorico_corrente || 0)}</strong>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Saldo Fisico Dichiarato (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={closeSaldoFisico}
                    onChange={(e) => setCloseSaldoFisico(e.target.value)}
                    placeholder="0.00"
                    className="rounded-2xl h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Note (obbligatorie se discrepanza)</Label>
                  <Textarea
                    value={closeNote}
                    onChange={(e) => setCloseNote(e.target.value)}
                    placeholder="Note chiusura..."
                    className="rounded-2xl resize-none"
                    rows={2}
                  />
                </div>
              </div>
              <Button
                onClick={handleCloseShift}
                disabled={closing}
                variant="destructive"
                className="w-full material-button"
              >
                {closing ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Square className="w-4 h-4 mr-2" />}
                Chiudi Turno
              </Button>
            </CardContent>
          </Card>
        </>
      ) : (
        /* Open Shift */
        <Card className="material-surface-elevated">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Play className="w-5 h-5 text-primary" />
              Apri Turno
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Seleziona una cassa libera e dichiara il saldo fisico per iniziare.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cassa</Label>
                <Select value={selectedCash} onValueChange={setSelectedCash}>
                  <SelectTrigger className="rounded-2xl h-12">
                    <SelectValue placeholder="Seleziona cassa" />
                  </SelectTrigger>
                  <SelectContent>
                    {cashes.filter((c) => c.status === 'libera').map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.name} ({formatCurrency(c.saldo_teorico)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Saldo Fisico Dichiarato (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={saldoFisico}
                  onChange={(e) => setSaldoFisico(e.target.value)}
                  placeholder="0.00"
                  className="rounded-2xl h-12"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Note (obbligatorie se discrepanza)</Label>
              <Textarea
                value={openNote}
                onChange={(e) => setOpenNote(e.target.value)}
                placeholder="Note apertura..."
                className="rounded-2xl resize-none"
                rows={2}
              />
            </div>
            <Button
              onClick={handleOpenShift}
              disabled={opening}
              className="w-full material-button"
            >
              {opening ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              Apri Turno
            </Button>

            {cashes.filter((c) => c.status === 'libera').length === 0 && (
              <p className="text-sm text-amber-600 text-center">Nessuna cassa disponibile al momento.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}