import { useEffect, useState, useCallback } from 'react';
import { cashApi, useAuthStore } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, BarChart3, TrendingUp, TrendingDown, ArrowLeftRight, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface KpiData {
  totale_incassi: number;
  totale_pagamenti: number;
  totale_sovvenzioni: number;
  totale_restituzioni: number;
  totale_svuotamenti_vlt: number;
  totale_svuotamenti_betsmart: number;
  turni_aperti: number;
}

interface DashboardData {
  banca: { saldo: number };
  cassa_centrale: { saldo: number };
  somma_casse_operatori: number;
  totale_liquidita: number;
  kpi: KpiData;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v);
}

export default function ReportsPage() {
  const { profile } = useAuthStore();
  const isAdmin = profile?.ruolo === 'admin';

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const d = await cashApi<DashboardData>('/dashboard');
      setData(d);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Accesso riservato agli amministratori</p>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="flex justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const kpi = data.kpi;

  return (
    <div className="space-y-6 fade-in max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />Report
          </h1>
          <p className="text-muted-foreground mt-1">Riepilogo finanziario giornaliero</p>
        </div>
        <Button variant="outline" size="icon" className="rounded-2xl" onClick={fetchData}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Liquidità */}
      <Card className="material-surface bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground mb-1">Liquidità Totale</p>
          <p className="text-3xl font-bold text-primary">{formatCurrency(data.totale_liquidita)}</p>
          <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Cassa Centrale</p>
              <p className="font-semibold">{formatCurrency(data.cassa_centrale.saldo)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Casse Operatore</p>
              <p className="font-semibold">{formatCurrency(data.somma_casse_operatori)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Banca</p>
              <p className="font-semibold">{formatCurrency(data.banca.saldo)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="material-surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-success" />Incassi Oggi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{formatCurrency(kpi.totale_incassi)}</p>
          </CardContent>
        </Card>

        <Card className="material-surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-destructive" />Pagamenti Oggi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(kpi.totale_pagamenti)}</p>
          </CardContent>
        </Card>

        <Card className="material-surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-info" />Sovvenzioni
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(kpi.totale_sovvenzioni)}</p>
          </CardContent>
        </Card>

        <Card className="material-surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-warning" />Restituzioni
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(kpi.totale_restituzioni)}</p>
          </CardContent>
        </Card>

        <Card className="material-surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Banknote className="w-4 h-4 text-primary" />Svuotamenti VLT
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(kpi.totale_svuotamenti_vlt)}</p>
          </CardContent>
        </Card>

        <Card className="material-surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Banknote className="w-4 h-4 text-primary" />Svuotamenti BetSmart
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(kpi.totale_svuotamenti_betsmart)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card className="material-surface">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Riepilogo Operativo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Turni Aperti</p>
              <p className="text-xl font-bold text-primary">{kpi.turni_aperti}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Saldo Netto Oggi</p>
              <p className={`text-xl font-bold ${kpi.totale_incassi - kpi.totale_pagamenti >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(kpi.totale_incassi - kpi.totale_pagamenti)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Tot. Svuotamenti</p>
              <p className="text-xl font-bold">
                {formatCurrency(kpi.totale_svuotamenti_vlt + kpi.totale_svuotamenti_betsmart)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Flusso Netto Casse</p>
              <p className="text-xl font-bold">
                {formatCurrency(kpi.totale_sovvenzioni - kpi.totale_restituzioni)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}