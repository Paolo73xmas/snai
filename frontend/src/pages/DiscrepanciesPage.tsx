import { useEffect, useState, useCallback } from 'react';
import { cashApi } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Discrepancy {
  id: number;
  user_name: string;
  user_role: string;
  cash_name: string;
  tipo: string;
  saldo_teorico: number;
  saldo_fisico: number;
  differenza: number;
  notes: string;
  status: string;
  verificato_da: string | null;
  created_at: string;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v);
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const statusColors: Record<string, string> = {
  da_verificare: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  verificata: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  approvata: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  contestata: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  chiusa: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

const statusLabels: Record<string, string> = {
  da_verificare: 'Da Verificare',
  verificata: 'Verificata',
  approvata: 'Approvata',
  contestata: 'Contestata',
  chiusa: 'Chiusa',
};

export default function DiscrepanciesPage() {
  const [items, setItems] = useState<Discrepancy[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [verifyStatus, setVerifyStatus] = useState('');
  const [verifyNote, setVerifyNote] = useState('');
  const [verifying, setVerifying] = useState(false);
  const limit = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { skip: page * limit, limit };
      const res = await cashApi<{ items: Discrepancy[]; total: number }>('/all-discrepancies', 'GET', params);
      let filtered = res.items || [];
      if (filterStatus !== 'all') {
        filtered = filtered.filter((d) => d.status === filterStatus);
      }
      setItems(filtered);
      setTotal(res.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleVerify = async (discId: number) => {
    if (!verifyStatus) {
      toast.error('Seleziona un nuovo stato');
      return;
    }
    setVerifying(true);
    try {
      const res = await cashApi<{ success: boolean }>('/verify-discrepancy', 'POST', {
        disc_id: discId,
        new_status: verifyStatus,
        note: verifyNote,
      });
      if (res.success) {
        toast.success('Discrepanza aggiornata!');
        setExpandedId(null);
        setVerifyStatus('');
        setVerifyNote('');
        fetchData();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || 'Errore verifica');
    } finally {
      setVerifying(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  // Summary stats
  const pendingCount = items.filter((d) => d.status === 'da_verificare').length;
  const positiveTotal = items.filter((d) => d.differenza > 0).reduce((s, d) => s + d.differenza, 0);
  const negativeTotal = items.filter((d) => d.differenza < 0).reduce((s, d) => s + d.differenza, 0);

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Discrepanze</h1>
          <p className="text-muted-foreground mt-1">{total} discrepanze totali</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(0); }}>
            <SelectTrigger className="w-[180px] rounded-2xl">
              <SelectValue placeholder="Tutti gli stati" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli stati</SelectItem>
              <SelectItem value="da_verificare">Da Verificare</SelectItem>
              <SelectItem value="verificata">Verificata</SelectItem>
              <SelectItem value="approvata">Approvata</SelectItem>
              <SelectItem value="contestata">Contestata</SelectItem>
              <SelectItem value="chiusa">Chiusa</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchData} variant="outline" className="rounded-2xl" size="icon">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="material-surface border-0">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Totale</p>
              <p className="text-lg font-bold">{total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="material-surface border-0">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">In Attesa</p>
              <p className="text-lg font-bold">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="material-surface border-0">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Eccedenze</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(positiveTotal)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="material-surface border-0">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ammanchi</p>
              <p className="text-lg font-bold text-red-600">{formatCurrency(negativeTotal)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Discrepancies List */}
      <Card className="material-surface">
        <CardContent className="p-0">
          {loading && items.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mb-2" />
              <p>Nessuna discrepanza trovata</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((d) => {
                const isExpanded = expandedId === d.id;
                return (
                  <div key={d.id}>
                    <button
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left"
                      onClick={() => {
                        setExpandedId(isExpanded ? null : d.id);
                        setVerifyStatus('');
                        setVerifyNote('');
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`${statusColors[d.status] || 'bg-gray-100 text-gray-800'} border-0 text-xs rounded-full`}>
                            {statusLabels[d.status] || d.status}
                          </Badge>
                          <span className="text-sm font-medium">{d.user_name}</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">{d.cash_name}</span>
                          <span className="text-xs text-muted-foreground capitalize">({d.tipo})</span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span>Teorico: {formatCurrency(d.saldo_teorico)}</span>
                          <span>Fisico: {formatCurrency(d.saldo_fisico)}</span>
                          {d.notes && <span className="truncate max-w-[200px]">"{d.notes}"</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                        <div className="text-right">
                          <p className={`font-bold ${d.differenza >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {d.differenza >= 0 ? '+' : ''}{formatCurrency(d.differenza)}
                          </p>
                          <p className="text-xs text-muted-foreground">{d.created_at ? formatDate(d.created_at) : ''}</p>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 bg-muted/20 border-t border-border/50">
                        <div className="space-y-3 max-w-md">
                          <p className="text-sm font-medium text-foreground">Verifica Discrepanza</p>
                          <div className="space-y-1.5">
                            <Label className="text-sm">Nuovo Stato</Label>
                            <Select value={verifyStatus} onValueChange={setVerifyStatus}>
                              <SelectTrigger className="rounded-2xl h-11">
                                <SelectValue placeholder="Seleziona stato" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="verificata">Verificata</SelectItem>
                                <SelectItem value="approvata">Approvata</SelectItem>
                                <SelectItem value="contestata">Contestata</SelectItem>
                                <SelectItem value="chiusa">Chiusa</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-sm">Note Verifica</Label>
                            <Textarea
                              value={verifyNote}
                              onChange={(e) => setVerifyNote(e.target.value)}
                              placeholder="Note sulla verifica..."
                              className="rounded-2xl resize-none"
                              rows={2}
                            />
                          </div>
                          <Button
                            onClick={() => handleVerify(d.id)}
                            disabled={verifying}
                            className="rounded-2xl gap-2"
                          >
                            {verifying && <RefreshCw className="w-4 h-4 animate-spin" />}
                            Conferma Verifica
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline" size="icon" className="rounded-2xl"
            onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Pagina {page + 1} di {totalPages}</span>
          <Button
            variant="outline" size="icon" className="rounded-2xl"
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}