import { useEffect, useState, useCallback } from 'react';
import { cashApi } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Wallet,
  RefreshCw,
  ArrowDownToLine,
  ArrowUpFromLine,
  Banknote,
  User,
  Lock,
  Unlock,
  AlertCircle,
} from 'lucide-react';

interface CashItem {
  id: number;
  name: string;
  saldo_teorico: number;
  status: string;
  current_operator_id: string | null;
  last_operator_name: string | null;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v);
}

const statusColors: Record<string, string> = {
  libera: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  in_uso: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  bloccata: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  da_verificare: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  disattivata: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

const statusLabels: Record<string, string> = {
  libera: 'Libera',
  in_uso: 'In Uso',
  bloccata: 'Bloccata',
  da_verificare: 'Da Verificare',
  disattivata: 'Disattivata',
};

const statusIcons: Record<string, React.ElementType> = {
  libera: Unlock,
  in_uso: User,
  bloccata: Lock,
  da_verificare: AlertCircle,
};

export default function CashesPage() {
  const [cashes, setCashes] = useState<CashItem[]>([]);
  const [ccSaldo, setCcSaldo] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<{ cashId: number; type: 'sovvenzione' | 'prelievo' } | null>(null);
  const [actionImporto, setActionImporto] = useState('');
  const [actionNote, setActionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cashesRes, dashRes] = await Promise.all([
        cashApi<CashItem[]>('/available-cashes'),
        cashApi<{ cassa_centrale: { saldo: number } }>('/dashboard'),
      ]);
      setCashes(cashesRes);
      setCcSaldo(dashRes.cassa_centrale.saldo);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async () => {
    if (!activeAction || !actionImporto || parseFloat(actionImporto) <= 0) {
      toast.error("Inserisci un importo valido");
      return;
    }
    setSubmitting(true);
    try {
      const importo = parseFloat(actionImporto);
      if (activeAction.type === 'sovvenzione') {
        const res = await cashApi<{ success: boolean }>('/sovvenzione', 'POST', {
          target_cash_id: activeAction.cashId,
          importo,
          note: actionNote,
        });
        if (res.success) toast.success('Sovvenzione completata!');
      } else {
        const res = await cashApi<{ success: boolean }>('/admin-withdrawal', 'POST', {
          source_cash_id: activeAction.cashId,
          importo,
          note: actionNote,
        });
        if (res.success) toast.success('Prelievo completato!');
      }
      setActiveAction(null);
      setActionImporto('');
      setActionNote('');
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || 'Errore operazione');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && cashes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Gestione Casse</h1>
          <p className="text-muted-foreground mt-1">Visualizza e gestisci le casse operatore</p>
        </div>
        <Button onClick={fetchData} variant="outline" className="rounded-2xl gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Aggiorna
        </Button>
      </div>

      {/* Cassa Centrale Summary */}
      <Card className="material-surface-elevated border-0 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center">
              <Banknote className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Cassa Centrale</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(ccSaldo)}</p>
              <p className="text-xs text-muted-foreground">Disponibile per sovvenzioni</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cashes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {cashes.map((cash) => {
          const StatusIcon = statusIcons[cash.status] || Wallet;
          const isActive = activeAction?.cashId === cash.id;
          return (
            <Card key={cash.id} className="material-surface">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-primary" />
                    {cash.name}
                  </CardTitle>
                  <Badge className={`${statusColors[cash.status] || ''} border-0 text-xs rounded-full`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusLabels[cash.status] || cash.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center py-2">
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(cash.saldo_teorico)}</p>
                  <p className="text-xs text-muted-foreground">Saldo Teorico</p>
                </div>

                {cash.last_operator_name && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="w-3.5 h-3.5" />
                    <span>Ultimo: {cash.last_operator_name}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant={isActive && activeAction?.type === 'sovvenzione' ? 'default' : 'outline'}
                    className="flex-1 rounded-2xl text-xs gap-1"
                    size="sm"
                    onClick={() => {
                      if (isActive && activeAction?.type === 'sovvenzione') {
                        setActiveAction(null);
                      } else {
                        setActiveAction({ cashId: cash.id, type: 'sovvenzione' });
                        setActionImporto('');
                        setActionNote('');
                      }
                    }}
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    Sovvenzione
                  </Button>
                  <Button
                    variant={isActive && activeAction?.type === 'prelievo' ? 'default' : 'outline'}
                    className="flex-1 rounded-2xl text-xs gap-1"
                    size="sm"
                    onClick={() => {
                      if (isActive && activeAction?.type === 'prelievo') {
                        setActiveAction(null);
                      } else {
                        setActiveAction({ cashId: cash.id, type: 'prelievo' });
                        setActionImporto('');
                        setActionNote('');
                      }
                    }}
                  >
                    <ArrowUpFromLine className="w-3.5 h-3.5" />
                    Prelievo
                  </Button>
                </div>

                {/* Inline Action Form */}
                {isActive && (
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <p className="text-sm font-medium">
                      {activeAction.type === 'sovvenzione' ? 'Sovvenzione da CC' : 'Prelievo verso CC'}
                    </p>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Importo (€)</Label>
                      <Input
                        type="number" step="0.01" min="0.01"
                        value={actionImporto}
                        onChange={(e) => setActionImporto(e.target.value)}
                        className="rounded-2xl h-10 text-sm"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Note</Label>
                      <Textarea
                        value={actionNote}
                        onChange={(e) => setActionNote(e.target.value)}
                        placeholder="Note..."
                        className="rounded-2xl resize-none text-sm"
                        rows={2}
                      />
                    </div>
                    <Button
                      onClick={handleAction}
                      disabled={submitting}
                      className="w-full rounded-2xl gap-2"
                      size="sm"
                    >
                      {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      Conferma
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {cashes.length === 0 && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nessuna cassa operatore configurata</p>
        </div>
      )}
    </div>
  );
}