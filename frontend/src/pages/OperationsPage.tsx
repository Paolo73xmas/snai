import { useEffect, useState, useCallback } from 'react';
import { cashApi, useAuthStore } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { RefreshCw, ArrowLeftRight, Banknote, Landmark } from 'lucide-react';

interface CashOption { id: number; name: string; saldo_teorico: number; status: string; }
interface VltOption { id: number; codice: string; name: string; }
interface BsOption { id: number; codice: string; name: string; }

function formatCurrency(v: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v);
}

export default function OperationsPage() {
  const { profile } = useAuthStore();
  const isAdmin = profile?.ruolo === 'admin';
  const isPlus = profile?.ruolo === 'operator_plus';
  const canManage = isAdmin || isPlus;

  const [cashes, setCashes] = useState<CashOption[]>([]);
  const [vlts, setVlts] = useState<VltOption[]>([]);
  const [betsmarts, setBetsmarts] = useState<BsOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Sovvenzione
  const [sovTargetCash, setSovTargetCash] = useState('');
  const [sovImporto, setSovImporto] = useState('');
  const [sovNote, setSovNote] = useState('');
  // Restituzione
  const [restSourceCash, setRestSourceCash] = useState('');
  const [restImporto, setRestImporto] = useState('');
  const [restNote, setRestNote] = useState('');
  // VLT
  const [vltId, setVltId] = useState('');
  const [vltImporto, setVltImporto] = useState('');
  const [vltDestCash, setVltDestCash] = useState('');
  const [vltNote, setVltNote] = useState('');
  // BetSmart
  const [bsId, setBsId] = useState('');
  const [bsImporto, setBsImporto] = useState('');
  const [bsDestCash, setBsDestCash] = useState('');
  const [bsNote, setBsNote] = useState('');
  // Bank
  const [bankOp, setBankOp] = useState<'deposit' | 'withdrawal'>('deposit');
  const [bankImporto, setBankImporto] = useState('');
  const [bankNote, setBankNote] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [c, v, b] = await Promise.all([
        cashApi<CashOption[]>('/available-cashes'),
        cashApi<VltOption[]>('/all-vlts'),
        cashApi<BsOption[]>('/all-betsmarts'),
      ]);
      setCashes(c);
      setVlts(v);
      setBetsmarts(b);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (endpoint: string, data: Record<string, any>, label: string) => {
    setSubmitting(true);
    try {
      const res = await cashApi(endpoint, 'POST', data);
      if (res.success) {
        toast.success(`${label} completata!`);
        fetchData();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || `Errore ${label}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 fade-in max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Operazioni</h1>
        <p className="text-muted-foreground mt-1">Gestisci trasferimenti, svuotamenti e operazioni bancarie</p>
      </div>

      <Tabs defaultValue="trasferimenti" className="w-full">
        <TabsList className="w-full justify-start rounded-2xl bg-muted/50 p-1 h-auto flex-wrap">
          <TabsTrigger value="trasferimenti" className="rounded-xl data-[state=active]:bg-background">
            <ArrowLeftRight className="w-4 h-4 mr-2" />Trasferimenti
          </TabsTrigger>
          {canManage && (
            <TabsTrigger value="svuotamenti" className="rounded-xl data-[state=active]:bg-background">
              <Banknote className="w-4 h-4 mr-2" />Svuotamenti
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="banca" className="rounded-xl data-[state=active]:bg-background">
              <Landmark className="w-4 h-4 mr-2" />Banca
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="trasferimenti" className="space-y-4 mt-4">
          {/* Sovvenzione */}
          <Card className="material-surface">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Sovvenzione (CC → Cassa Operatore)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Cassa Destinazione</Label>
                  <Select value={sovTargetCash} onValueChange={setSovTargetCash}>
                    <SelectTrigger className="rounded-2xl h-11"><SelectValue placeholder="Seleziona" /></SelectTrigger>
                    <SelectContent>
                      {cashes.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.name} ({formatCurrency(c.saldo_teorico)})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Importo (€)</Label>
                  <Input type="number" step="0.01" min="0.01" value={sovImporto} onChange={(e) => setSovImporto(e.target.value)} className="rounded-2xl h-11" />
                </div>
              </div>
              <Textarea value={sovNote} onChange={(e) => setSovNote(e.target.value)} placeholder="Note..." className="rounded-2xl resize-none" rows={2} />
              <Button
                disabled={submitting} className="w-full rounded-2xl"
                onClick={() => handleSubmit('/sovvenzione', { target_cash_id: parseInt(sovTargetCash), importo: parseFloat(sovImporto), note: sovNote }, 'Sovvenzione')}
              >
                {submitting && <RefreshCw className="w-4 h-4 animate-spin mr-2" />}Esegui Sovvenzione
              </Button>
            </CardContent>
          </Card>

          {/* Restituzione */}
          <Card className="material-surface">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Restituzione (Cassa Operatore → CC)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Cassa Origine</Label>
                  <Select value={restSourceCash} onValueChange={setRestSourceCash}>
                    <SelectTrigger className="rounded-2xl h-11"><SelectValue placeholder="Seleziona" /></SelectTrigger>
                    <SelectContent>
                      {cashes.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.name} ({formatCurrency(c.saldo_teorico)})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Importo (€)</Label>
                  <Input type="number" step="0.01" min="0.01" value={restImporto} onChange={(e) => setRestImporto(e.target.value)} className="rounded-2xl h-11" />
                </div>
              </div>
              <Textarea value={restNote} onChange={(e) => setRestNote(e.target.value)} placeholder="Note..." className="rounded-2xl resize-none" rows={2} />
              <Button
                disabled={submitting} className="w-full rounded-2xl"
                onClick={() => handleSubmit('/restituzione', { source_cash_id: parseInt(restSourceCash), importo: parseFloat(restImporto), note: restNote }, 'Restituzione')}
              >
                {submitting && <RefreshCw className="w-4 h-4 animate-spin mr-2" />}Esegui Restituzione
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {canManage && (
          <TabsContent value="svuotamenti" className="space-y-4 mt-4">
            {/* VLT */}
            <Card className="material-surface">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Svuotamento VLT</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">VLT</Label>
                    <Select value={vltId} onValueChange={setVltId}>
                      <SelectTrigger className="rounded-2xl h-11"><SelectValue placeholder="Seleziona" /></SelectTrigger>
                      <SelectContent>
                        {vlts.map((v) => (
                          <SelectItem key={v.id} value={v.id.toString()}>{v.name} ({v.codice})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Importo (€)</Label>
                    <Input type="number" step="0.01" value={vltImporto} onChange={(e) => setVltImporto(e.target.value)} className="rounded-2xl h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Dest. Cassa</Label>
                    <Select value={vltDestCash} onValueChange={setVltDestCash}>
                      <SelectTrigger className="rounded-2xl h-11"><SelectValue placeholder="Seleziona" /></SelectTrigger>
                      <SelectContent>
                        {cashes.map((c) => (
                          <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Textarea value={vltNote} onChange={(e) => setVltNote(e.target.value)} placeholder="Note..." className="rounded-2xl resize-none" rows={2} />
                <Button
                  disabled={submitting} className="w-full rounded-2xl"
                  onClick={() => handleSubmit('/svuotamento-vlt', { vlt_id: parseInt(vltId), importo: parseFloat(vltImporto), dest_cash_id: parseInt(vltDestCash), note: vltNote }, 'Svuotamento VLT')}
                >
                  {submitting && <RefreshCw className="w-4 h-4 animate-spin mr-2" />}Esegui Svuotamento VLT
                </Button>
              </CardContent>
            </Card>

            {/* BetSmart */}
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
                    <Input type="number" step="0.01" value={bsImporto} onChange={(e) => setBsImporto(e.target.value)} className="rounded-2xl h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Dest. Cassa</Label>
                    <Select value={bsDestCash} onValueChange={setBsDestCash}>
                      <SelectTrigger className="rounded-2xl h-11"><SelectValue placeholder="Seleziona" /></SelectTrigger>
                      <SelectContent>
                        {cashes.map((c) => (
                          <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Textarea value={bsNote} onChange={(e) => setBsNote(e.target.value)} placeholder="Note..." className="rounded-2xl resize-none" rows={2} />
                <Button
                  disabled={submitting} className="w-full rounded-2xl"
                  onClick={() => handleSubmit('/svuotamento-betsmart', { betsmart_id: parseInt(bsId), importo: parseFloat(bsImporto), dest_cash_id: parseInt(bsDestCash), note: bsNote }, 'Svuotamento BetSmart')}
                >
                  {submitting && <RefreshCw className="w-4 h-4 animate-spin mr-2" />}Esegui Svuotamento BetSmart
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="banca" className="space-y-4 mt-4">
            <Card className="material-surface">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Operazioni Bancarie</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    variant={bankOp === 'deposit' ? 'default' : 'outline'} className="flex-1 rounded-2xl"
                    onClick={() => setBankOp('deposit')}
                  >
                    Versamento (CC → Banca)
                  </Button>
                  <Button
                    variant={bankOp === 'withdrawal' ? 'default' : 'outline'} className="flex-1 rounded-2xl"
                    onClick={() => setBankOp('withdrawal')}
                  >
                    Prelievo (Banca → CC)
                  </Button>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Importo (€)</Label>
                  <Input type="number" step="0.01" min="0.01" value={bankImporto} onChange={(e) => setBankImporto(e.target.value)} className="rounded-2xl h-11" />
                </div>
                <Textarea value={bankNote} onChange={(e) => setBankNote(e.target.value)} placeholder="Note..." className="rounded-2xl resize-none" rows={2} />
                <Button
                  disabled={submitting} className="w-full rounded-2xl"
                  onClick={() => handleSubmit(bankOp === 'deposit' ? '/bank-deposit' : '/bank-withdrawal', { importo: parseFloat(bankImporto), note: bankNote }, bankOp === 'deposit' ? 'Versamento' : 'Prelievo')}
                >
                  {submitting && <RefreshCw className="w-4 h-4 animate-spin mr-2" />}
                  Esegui {bankOp === 'deposit' ? 'Versamento' : 'Prelievo'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}