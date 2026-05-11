import { useEffect, useState, useCallback } from 'react';
import { cashApi, useAuthStore } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, History, ChevronLeft, ChevronRight } from 'lucide-react';

interface Movement {
  id: number;
  user_name: string;
  user_role: string;
  tipo_movimento: string;
  importo: number;
  causale: string;
  notes: string;
  status: string;
  saldo_origine_prima: number | null;
  saldo_origine_dopo: number | null;
  saldo_destinazione_prima: number | null;
  saldo_destinazione_dopo: number | null;
  created_at: string;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v);
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const tipoLabels: Record<string, string> = {
  APERTURA_TURNO: 'Apertura Turno',
  CHIUSURA_TURNO: 'Chiusura Turno',
  INCASSO_SCOMMESSE_SPORTIVE: 'Incasso Sportive',
  INCASSO_SCOMMESSE_IPPICHE: 'Incasso Ippiche',
  INCASSO_SCOMMESSE_VIRTUALI: 'Incasso Virtuali',
  INCASSO_RICARICHE: 'Incasso Ricariche',
  PAGAMENTO_SCOMMESSE_SPORTIVE: 'Pagamento Sportive',
  PAGAMENTO_SCOMMESSE_IPPICHE: 'Pagamento Ippiche',
  PAGAMENTO_SCOMMESSE_VIRTUALI: 'Pagamento Virtuali',
  PAGAMENTO_VLT: 'Pagamento VLT',
  PAGAMENTO_PRELIEVI_WEB: 'Pagamento Prelievi Web',
  SOVVENZIONE_CASSA: 'Sovvenzione',
  RESTITUZIONE_CASSA: 'Restituzione',
  SVUOTAMENTO_VLT: 'Svuotamento VLT',
  SVUOTAMENTO_BETSMART: 'Svuotamento BetSmart',
  VERSAMENTO_BANCA: 'Versamento Banca',
  PRELIEVO_BANCA: 'Prelievo Banca',
  PRELIEVO_ADMIN: 'Prelievo Admin',
  RETTIFICA_ADMIN: 'Rettifica Admin',
  DISCREPANZA_APERTURA: 'Discrepanza Apertura',
  DISCREPANZA_CHIUSURA: 'Discrepanza Chiusura',
  MODIFICA_UTENTE: 'Modifica Utente',
};

const tipoColors: Record<string, string> = {
  INCASSO: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  PAGAMENTO: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  SOVVENZIONE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  RESTITUZIONE: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  SVUOTAMENTO: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  DEFAULT: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

function getTipoColor(tipo: string) {
  for (const key of Object.keys(tipoColors)) {
    if (tipo.startsWith(key)) return tipoColors[key];
  }
  return tipoColors.DEFAULT;
}

export default function MovementsPage() {
  const { profile } = useAuthStore();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);
  const limit = 20;

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { skip: page * limit, limit };
      if (filterType !== 'all') params.tipo = filterType;
      const res = await cashApi<{ items: Movement[]; total: number }>('/all-movements', 'GET', params);
      setMovements(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, filterType]);

  useEffect(() => { fetchMovements(); }, [fetchMovements]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Movimenti</h1>
          <p className="text-muted-foreground mt-1">{total} movimenti totali</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(0); }}>
            <SelectTrigger className="w-[200px] rounded-2xl">
              <SelectValue placeholder="Tutti i tipi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i tipi</SelectItem>
              <SelectItem value="INCASSO_SCOMMESSE_SPORTIVE">Incasso Sportive</SelectItem>
              <SelectItem value="INCASSO_SCOMMESSE_IPPICHE">Incasso Ippiche</SelectItem>
              <SelectItem value="INCASSO_RICARICHE">Incasso Ricariche</SelectItem>
              <SelectItem value="PAGAMENTO_SCOMMESSE_SPORTIVE">Pagamento Sportive</SelectItem>
              <SelectItem value="PAGAMENTO_VLT">Pagamento VLT</SelectItem>
              <SelectItem value="SOVVENZIONE_CASSA">Sovvenzione</SelectItem>
              <SelectItem value="RESTITUZIONE_CASSA">Restituzione</SelectItem>
              <SelectItem value="SVUOTAMENTO_VLT">Svuotamento VLT</SelectItem>
              <SelectItem value="SVUOTAMENTO_BETSMART">Svuotamento BetSmart</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchMovements} variant="outline" className="rounded-2xl" size="icon">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <Card className="material-surface">
        <CardContent className="p-0">
          {loading && movements.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <History className="w-8 h-8 mb-2" />
              <p>Nessun movimento trovato</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {movements.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`${getTipoColor(m.tipo_movimento)} border-0 text-xs rounded-full`}>
                        {tipoLabels[m.tipo_movimento] || m.tipo_movimento}
                      </Badge>
                      {profile?.ruolo === 'admin' && (
                        <span className="text-xs text-muted-foreground">{m.user_name}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{m.causale}</p>
                    {m.notes && <p className="text-xs text-muted-foreground/70 truncate">{m.notes}</p>}
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className={`font-semibold ${m.tipo_movimento.startsWith('INCASSO') || m.tipo_movimento.startsWith('SVUOTAMENTO') || m.tipo_movimento === 'SOVVENZIONE_CASSA' ? 'text-green-600' : m.tipo_movimento.startsWith('PAGAMENTO') || m.tipo_movimento === 'RESTITUZIONE_CASSA' ? 'text-red-600' : 'text-foreground'}`}>
                      {formatCurrency(m.importo)}
                    </p>
                    <p className="text-xs text-muted-foreground">{m.created_at ? formatDate(m.created_at) : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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