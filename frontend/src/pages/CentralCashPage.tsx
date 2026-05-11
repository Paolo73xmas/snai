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
import { RefreshCw, Vault, ArrowDown, ArrowUp } from 'lucide-react';

interface CashOption { id: number; name: string; saldo_teorico: number; status: string; }
interface DashboardData {
  cassa_centrale: { saldo: number; id: number | null };
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v);
}

export default function CentralCashPage() {
  const { profile } = useAuthStore();
  const canAccess = profile?.ruolo === 'admin' || profile?.ruolo === 'operator_plus';
  const isAdmin = profile?.ruolo === 'admin';

  const [centraleSaldo, setCentraleSaldo] = useState(0);
  const [cashes, setCashes] = useState<CashOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Sovvenzione form
  const [sovTargetCash, setSovTargetCash] = useState('');
  const [sovImporto, setSovImporto] = useState('');
  const [sovNote, setSovNote] = useState('');
  // Restituzione form
  const [restSourceCash, setRestSourceCash] = useState('');
  const [restImporto, setRestImporto] = useState('');
  const [restNote, setRestNote] = useState('');
  // Admin withdrawal form
  const [wdSourceCash, setWdSourceCash] = useState('');
  const [wdImporto, setWdImporto] = useState('');
  const [wdNote, setWdNote] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [dash, c] = await Promise.all([
        cashApi<DashboardData>('/dashboard'),
        cashApi<CashOption[]>('/available-cashes'),
      ]);
      setCentraleSaldo(dash.cassa_centrale.saldo);
      setCashes(c);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Accesso non autorizzato</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
            <Vault className="w-8 h-8 text-primary" />Cassa Centrale
          </h1>
          <p className="text-muted-foreground mt-1">Gestione della Cassa Centrale</p>
        </div>
        <Button variant="outline" size="icon" className="rounded-2xl" onClick={fetchData}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Saldo */}
      <Card className="material-surface bg-primary/5 border-primary/20">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground mb-1">Saldo Cassa Centrale</p>
          <p className="text-4xl font-bold text-primary">{formatCurrency(centraleSaldo)}</p>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="sovvenzione" className="w-full">
          <TabsList className="w-full justify-start rounded-2xl bg-muted/50 p-1 h-auto flex-wrap">
            <TabsTrigger value="sovvenzione" className="rounded-xl data-[state=active]:bg-background">
              <ArrowUp className="w-4 h-4 mr-2" />Sovvenzione
            </TabsTrigger>
            <TabsTrigger value="restituzione" className="rounded-xl data-[state=active]:bg-background">
              <ArrowDown className="w-4 h-4 mr-2" />Restituzione
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="prelievo" className="rounded-xl data-[state=active]:bg-background">
                <ArrowDown className="w-4 h-4 mr-2" />Prelievo Admin
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="sovvenzione" className="mt-4">
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
                    <Input type="number" step="0.01" min="0.01" value={sovImporto} onChange={(e) => setSovImporto(e.target.value)} className="rounded-2xl h-11" placeholder="0.00" />
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
          </TabsContent>

          <TabsContent value="restituzione" className="mt-4">
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
                    <Input type="number" step="0.01" min="0.01" value={restImporto} onChange={(e) => setRestImporto(e.target.value)} className="rounded-2xl h-11" placeholder="0.00" />
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

          {isAdmin && (
            <TabsContent value="prelievo" className="mt-4">
              <Card className="material-surface">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Prelievo Admin (Cassa Operatore → CC)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Cassa Origine</Label>
                      <Select value={wdSourceCash} onValueChange={setWdSourceCash}>
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
                      <Input type="number" step="0.01" min="0.01" value={wdImporto} onChange={(e) => setWdImporto(e.target.value)} className="rounded-2xl h-11" placeholder="0.00" />
                    </div>
                  </div>
                  <Textarea value={wdNote} onChange={(e) => setWdNote(e.target.value)} placeholder="Note..." className="rounded-2xl resize-none" rows={2} />
                  <Button
                    disabled={submitting} className="w-full rounded-2xl"
                    onClick={() => handleSubmit('/admin-withdrawal', { source_cash_id: parseInt(wdSourceCash), importo: parseFloat(wdImporto), note: wdNote }, 'Prelievo Admin')}
                  >
                    {submitting && <RefreshCw className="w-4 h-4 animate-spin mr-2" />}Esegui Prelievo
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}