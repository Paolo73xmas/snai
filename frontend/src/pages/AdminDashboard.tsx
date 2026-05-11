import { useEffect, useState, useCallback } from 'react';
import { cashApi } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Banknote,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  AlertTriangle,
  Users,
  RefreshCw,
  Landmark,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardData {
  banca: { saldo: number; id: number | null };
  cassa_centrale: { saldo: number; id: number | null };
  somma_casse_operatori: number;
  totale_liquidita: number;
  casse_operatore: Array<{
    id: number; name: string; saldo_teorico: number; status: string;
    current_operator_id: string | null; last_operator_name: string | null;
  }>;
  turni_attivi: Array<{
    id: number; user_name: string; user_role: string; cash_name: string;
    cash_id: number; saldo_iniziale: number; opened_at: string | null;
    totale_incassi: number; totale_pagamenti: number;
  }>;
  discrepanze_oggi: Array<{
    id: number; user_name: string; cash_name: string; tipo: string;
    differenza: number; status: string; notes: string;
  }>;
  kpi: {
    totale_incassi: number; totale_pagamenti: number;
    totale_sovvenzioni: number; totale_restituzioni: number;
    totale_svuotamenti_vlt: number; totale_svuotamenti_betsmart: number;
    turni_aperti: number;
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
}

const statusColors: Record<string, string> = {
  libera: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  in_uso: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  bloccata: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  da_verificare: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  disattivata: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await cashApi<DashboardData>('/dashboard');
      setData(res);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return <p className="text-center text-muted-foreground p-8">Errore nel caricamento dei dati</p>;

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Panoramica della gestione casse</p>
        </div>
        <Button onClick={fetchDashboard} variant="outline" className="rounded-2xl gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Aggiorna
        </Button>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="material-surface-elevated border-0 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center">
                <Banknote className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Liquidità Totale</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(data.totale_liquidita)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="material-surface-elevated border-0">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Landmark className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Banca</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(data.banca.saldo)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="material-surface-elevated border-0">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Cassa Centrale</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(data.cassa_centrale.saldo)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="material-surface-elevated border-0">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <Users className="w-6 h-6 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Casse Operatori</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(data.somma_casse_operatori)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today KPIs */}
      <Card className="material-surface">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">KPI di Oggi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center p-3 rounded-2xl bg-green-50 dark:bg-green-900/10">
              <TrendingUp className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Incassi</p>
              <p className="font-bold text-green-700 dark:text-green-400">{formatCurrency(data.kpi.totale_incassi)}</p>
            </div>
            <div className="text-center p-3 rounded-2xl bg-red-50 dark:bg-red-900/10">
              <TrendingDown className="w-5 h-5 text-red-600 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Pagamenti</p>
              <p className="font-bold text-red-700 dark:text-red-400">{formatCurrency(data.kpi.totale_pagamenti)}</p>
            </div>
            <div className="text-center p-3 rounded-2xl bg-blue-50 dark:bg-blue-900/10">
              <ArrowLeftRight className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Sovvenzioni</p>
              <p className="font-bold text-blue-700 dark:text-blue-400">{formatCurrency(data.kpi.totale_sovvenzioni)}</p>
            </div>
            <div className="text-center p-3 rounded-2xl bg-orange-50 dark:bg-orange-900/10">
              <ArrowLeftRight className="w-5 h-5 text-orange-600 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Restituzioni</p>
              <p className="font-bold text-orange-700 dark:text-orange-400">{formatCurrency(data.kpi.totale_restituzioni)}</p>
            </div>
            <div className="text-center p-3 rounded-2xl bg-purple-50 dark:bg-purple-900/10">
              <Banknote className="w-5 h-5 text-purple-600 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">VLT</p>
              <p className="font-bold text-purple-700 dark:text-purple-400">{formatCurrency(data.kpi.totale_svuotamenti_vlt)}</p>
            </div>
            <div className="text-center p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-900/10">
              <Banknote className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">BetSmart</p>
              <p className="font-bold text-indigo-700 dark:text-indigo-400">{formatCurrency(data.kpi.totale_svuotamenti_betsmart)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two columns: Active Shifts + Operator Cashes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Shifts */}
        <Card className="material-surface">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Turni Attivi ({data.kpi.turni_aperti})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.turni_attivi.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">Nessun turno attivo</p>
            ) : (
              <div className="space-y-3">
                {data.turni_attivi.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-2xl bg-muted/50">
                    <div>
                      <p className="font-medium text-sm">{s.user_name}</p>
                      <p className="text-xs text-muted-foreground">{s.cash_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-green-600">+{formatCurrency(s.totale_incassi || 0)}</p>
                      <p className="text-xs text-red-600">-{formatCurrency(s.totale_pagamenti || 0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Operator Cashes */}
        <Card className="material-surface">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              Casse Operatore
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.casse_operatore.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-2xl bg-muted/50">
                  <div>
                    <p className="font-medium text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.last_operator_name ? `Ultimo: ${c.last_operator_name}` : 'Nessun operatore'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-sm">{formatCurrency(c.saldo_teorico)}</p>
                    <Badge className={`${statusColors[c.status] || ''} border-0 text-xs rounded-full`}>
                      {c.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Discrepancies */}
      {data.discrepanze_oggi.length > 0 && (
        <Card className="material-surface border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              Discrepanze di Oggi ({data.discrepanze_oggi.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.discrepanze_oggi.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/10">
                  <div>
                    <p className="font-medium text-sm">{d.user_name} - {d.cash_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{d.tipo} • {d.notes || 'Nessuna nota'}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-sm ${d.differenza >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {d.differenza >= 0 ? '+' : ''}{formatCurrency(d.differenza)}
                    </p>
                    <Badge className={`${statusColors[d.status] || 'bg-gray-100 text-gray-800'} border-0 text-xs rounded-full`}>
                      {d.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}