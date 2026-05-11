import { useEffect, useState, useCallback } from 'react';
import { cashApi, useAuthStore } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ShiftData {
  id: number;
  user_name: string;
  user_role: string;
  cash_name: string;
  cash_id: number;
  saldo_iniziale: number;
  opened_at: string | null;
  totale_incassi: number;
  totale_pagamenti: number;
}

interface DashboardData {
  turni_attivi: ShiftData[];
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v);
}

function formatDateTime(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
}

export default function ShiftsPage() {
  const { profile } = useAuthStore();
  const isAdmin = profile?.ruolo === 'admin';

  const [shifts, setShifts] = useState<ShiftData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await cashApi<DashboardData>('/dashboard');
      setShifts(data.turni_attivi || []);
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

  return (
    <div className="space-y-6 fade-in max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
            <Clock className="w-8 h-8 text-primary" />Turni
          </h1>
          <p className="text-muted-foreground mt-1">Monitora i turni attivi degli operatori</p>
        </div>
        <Button variant="outline" size="icon" className="rounded-2xl" onClick={fetchData}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : shifts.length === 0 ? (
        <Card className="material-surface">
          <CardContent className="p-8 text-center">
            <Clock className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Nessun turno attivo al momento</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shifts.map((s) => (
            <Card key={s.id} className="material-surface">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <User className="w-4 h-4" />{s.user_name}
                  </CardTitle>
                  <Badge variant="secondary" className="rounded-full text-xs capitalize">{s.user_role}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Cassa</p>
                    <p className="font-medium">{s.cash_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Apertura</p>
                    <p className="font-medium">{formatDateTime(s.opened_at)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Saldo Iniziale</p>
                    <p className="font-medium">{formatCurrency(s.saldo_iniziale)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Incassi / Pagamenti</p>
                    <p className="font-medium text-success">{formatCurrency(s.totale_incassi)}</p>
                    <p className="font-medium text-destructive">{formatCurrency(s.totale_pagamenti)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}