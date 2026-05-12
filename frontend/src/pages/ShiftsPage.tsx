import { useEffect, useState, useCallback } from 'react';
import { cashApi, useAuthStore } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Clock, User, Image, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

interface ClosedShiftData {
  id: number;
  user_name: string;
  user_role: string;
  cash_name: string;
  cash_id: number;
  opened_at: string | null;
  closed_at: string | null;
  saldo_teorico_chiusura: number | null;
  saldo_fisico_chiusura: number | null;
  discrepanza_chiusura: number | null;
  note_chiusura: string | null;
  status: string;
  totale_incassi: number | null;
  totale_pagamenti: number | null;
  receipt_photo_url: string | null;
  pos_photo_url: string | null;
}

interface DashboardData {
  turni_attivi: ShiftData[];
}

function formatCurrency(v: number | null | undefined) {
  if (v == null) return '€ 0,00';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v);
}

function formatDateTime(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
}

function PhotoLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-3xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon"
          className="absolute -top-10 right-0 text-white hover:bg-white/20"
          onClick={onClose}
        >
          <X className="w-6 h-6" />
        </Button>
        <img src={url} alt="Foto turno" className="w-full h-auto max-h-[85vh] object-contain rounded-lg" />
      </div>
    </div>
  );
}

function PhotoThumbnail({ url, label }: { url: string | null; label: string }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!url) return null;

  return (
    <>
      <button
        onClick={() => setLightboxOpen(true)}
        className="relative group cursor-pointer rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
      >
        <img src={url} alt={label} className="w-20 h-20 object-cover" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <Image className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-0.5 truncate">
          {label}
        </span>
      </button>
      {lightboxOpen && <PhotoLightbox url={url} onClose={() => setLightboxOpen(false)} />}
    </>
  );
}

export default function ShiftsPage() {
  const { profile } = useAuthStore();
  const isAdmin = profile?.ruolo === 'admin';

  const [shifts, setShifts] = useState<ShiftData[]>([]);
  const [closedShifts, setClosedShifts] = useState<ClosedShiftData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingClosed, setLoadingClosed] = useState(false);
  const [activeTab, setActiveTab] = useState('attivi');

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

  const fetchClosedShifts = useCallback(async () => {
    try {
      setLoadingClosed(true);
      const data = await cashApi<{ items: ClosedShiftData[] }>('/closed-shifts');
      setClosedShifts(data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingClosed(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (activeTab === 'chiusi') {
      fetchClosedShifts();
    }
  }, [activeTab, fetchClosedShifts]);

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
          <p className="text-muted-foreground mt-1">Monitora i turni attivi e chiusi</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="rounded-2xl"
          onClick={activeTab === 'attivi' ? fetchData : fetchClosedShifts}
        >
          <RefreshCw className={`w-4 h-4 ${(loading || loadingClosed) ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="attivi">Turni Attivi</TabsTrigger>
          <TabsTrigger value="chiusi">Turni Chiusi</TabsTrigger>
        </TabsList>

        <TabsContent value="attivi" className="mt-4">
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
        </TabsContent>

        <TabsContent value="chiusi" className="mt-4">
          {loadingClosed ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : closedShifts.length === 0 ? (
            <Card className="material-surface">
              <CardContent className="p-8 text-center">
                <Clock className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Nessun turno chiuso trovato</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {closedShifts.map((s) => (
                <Card key={s.id} className="material-surface">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <User className="w-4 h-4" />{s.user_name}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {s.status === 'chiuso_con_discrepanza' && (
                          <Badge variant="destructive" className="rounded-full text-xs flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />Discrepanza
                          </Badge>
                        )}
                        <Badge variant="secondary" className="rounded-full text-xs capitalize">{s.user_role}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Cassa</p>
                        <p className="font-medium">{s.cash_name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Apertura</p>
                        <p className="font-medium">{formatDateTime(s.opened_at)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Chiusura</p>
                        <p className="font-medium">{formatDateTime(s.closed_at)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Saldo Fisico</p>
                        <p className="font-medium">{formatCurrency(s.saldo_fisico_chiusura)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Saldo Teorico</p>
                        <p className="font-medium">{formatCurrency(s.saldo_teorico_chiusura)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Discrepanza</p>
                        <p className={`font-medium ${(s.discrepanza_chiusura ?? 0) !== 0 ? 'text-destructive' : ''}`}>
                          {formatCurrency(s.discrepanza_chiusura)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Incassi</p>
                        <p className="font-medium text-success">{formatCurrency(s.totale_incassi)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Pagamenti</p>
                        <p className="font-medium text-destructive">{formatCurrency(s.totale_pagamenti)}</p>
                      </div>
                    </div>

                    {s.note_chiusura && (
                      <div className="text-sm">
                        <p className="text-muted-foreground text-xs">Note</p>
                        <p className="font-medium">{s.note_chiusura}</p>
                      </div>
                    )}

                    {(s.receipt_photo_url || s.pos_photo_url) && (
                      <div className="flex gap-3 pt-2 border-t border-border">
                        <PhotoThumbnail url={s.receipt_photo_url} label="Scontrino" />
                        <PhotoThumbnail url={s.pos_photo_url} label="POS" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}