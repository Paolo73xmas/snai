import { useEffect, useState, useCallback } from 'react';
import { cashApi } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Clock, User, Image, X, AlertTriangle, ChevronDown, ChevronUp, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ClosedShiftData {
  id: number;
  user_name: string;
  user_role: string;
  cash_name: string;
  cash_id: number;
  opened_at: string | null;
  closed_at: string | null;
  saldo_teorico_apertura: number | null;
  saldo_fisico_apertura: number | null;
  discrepanza_apertura: number | null;
  note_apertura: string | null;
  saldo_teorico_chiusura: number | null;
  saldo_fisico_chiusura: number | null;
  discrepanza_chiusura: number | null;
  note_chiusura: string | null;
  status: string;
  totale_incassi: number | null;
  totale_pagamenti: number | null;
  totale_sovvenzioni: number | null;
  totale_restituzioni: number | null;
  totale_svuotamenti: number | null;
  receipt_photo_url: string | null;
  pos_photo_url: string | null;
}

function formatCurrency(v: number | null | undefined) {
  if (v == null) return '€ 0,00';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v);
}

function formatDateTime(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ClosedShiftsPage() {
  const [closedShifts, setClosedShifts] = useState<ClosedShiftData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchClosedShifts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await cashApi<{ items: ClosedShiftData[] }>('/closed-shifts');
      setClosedShifts(data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClosedShifts();
  }, [fetchClosedShifts]);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6 fade-in max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
            <Clock className="w-8 h-8 text-primary" />Turni Chiusi
          </h1>
          <p className="text-muted-foreground mt-1">Storico dei turni completati</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="rounded-2xl"
          onClick={fetchClosedShifts}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {loading ? (
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
          {closedShifts.map((s) => {
            const isExpanded = expandedId === s.id;
            const hasPhotos = !!(s.receipt_photo_url || s.pos_photo_url);

            return (
              <Card key={s.id} className="material-surface overflow-hidden">
                {/* Clickable header summary */}
                <button
                  className="w-full text-left"
                  onClick={() => toggleExpand(s.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <User className="w-4 h-4" />{s.user_name}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {hasPhotos && (
                          <Badge variant="outline" className="rounded-full text-xs flex items-center gap-1">
                            <Camera className="w-3 h-3" />Foto
                          </Badge>
                        )}
                        {s.status === 'chiuso_con_discrepanza' && (
                          <Badge variant="destructive" className="rounded-full text-xs flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />Discrepanza
                          </Badge>
                        )}
                        <Badge variant="secondary" className="rounded-full text-xs capitalize">{s.user_role}</Badge>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Cassa</p>
                        <p className="font-medium">{s.cash_name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Chiusura</p>
                        <p className="font-medium">{formatDateTime(s.closed_at)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Saldo Fisico</p>
                        <p className="font-medium">{formatCurrency(s.saldo_fisico_chiusura)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Discrepanza</p>
                        <p className={`font-medium ${(s.discrepanza_chiusura ?? 0) !== 0 ? 'text-destructive' : ''}`}>
                          {formatCurrency(s.discrepanza_chiusura)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </button>

                {/* Expanded detail section */}
                <div
                  className={cn(
                    'overflow-hidden transition-all duration-300 ease-in-out',
                    isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                  )}
                >
                  <div className="border-t border-border px-6 py-4 space-y-4 bg-muted/30">
                    {/* Full financial details */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2">Dettagli Finanziari</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Apertura</p>
                          <p className="font-medium">{formatDateTime(s.opened_at)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Chiusura</p>
                          <p className="font-medium">{formatDateTime(s.closed_at)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Saldo Teorico Chiusura</p>
                          <p className="font-medium">{formatCurrency(s.saldo_teorico_chiusura)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Saldo Fisico Chiusura</p>
                          <p className="font-medium">{formatCurrency(s.saldo_fisico_chiusura)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Discrepanza</p>
                          <p className={`font-medium ${(s.discrepanza_chiusura ?? 0) !== 0 ? 'text-destructive font-bold' : 'text-green-600'}`}>
                            {formatCurrency(s.discrepanza_chiusura)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Totale Incassi</p>
                          <p className="font-medium text-green-600">{formatCurrency(s.totale_incassi)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Totale Pagamenti</p>
                          <p className="font-medium text-red-600">{formatCurrency(s.totale_pagamenti)}</p>
                        </div>
                        {s.totale_sovvenzioni != null && (
                          <div>
                            <p className="text-muted-foreground text-xs">Sovvenzioni</p>
                            <p className="font-medium">{formatCurrency(s.totale_sovvenzioni)}</p>
                          </div>
                        )}
                        {s.totale_restituzioni != null && (
                          <div>
                            <p className="text-muted-foreground text-xs">Restituzioni</p>
                            <p className="font-medium">{formatCurrency(s.totale_restituzioni)}</p>
                          </div>
                        )}
                        {s.totale_svuotamenti != null && (
                          <div>
                            <p className="text-muted-foreground text-xs">Svuotamenti</p>
                            <p className="font-medium">{formatCurrency(s.totale_svuotamenti)}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Notes */}
                    {s.note_chiusura && (
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-1">Note Chiusura</h4>
                        <p className="text-sm text-muted-foreground bg-background rounded-xl p-3 border border-border">
                          {s.note_chiusura}
                        </p>
                      </div>
                    )}

                    {/* Photos section */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Camera className="w-4 h-4" />Foto Turno
                      </h4>
                      {hasPhotos ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Receipt photo - Biglietto Fine Turno */}
                          {s.receipt_photo_url ? (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">📄 Biglietto Fine Turno</p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLightboxUrl(s.receipt_photo_url);
                                }}
                                className="relative group w-full"
                              >
                                <img
                                  src={s.receipt_photo_url}
                                  alt="Biglietto Fine Turno"
                                  className="w-full h-48 object-cover rounded-xl border border-border group-hover:ring-2 ring-primary transition-all shadow-sm"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="bg-white/90 rounded-full p-2">
                                    <Image className="w-5 h-5 text-foreground" />
                                  </div>
                                  <span className="absolute bottom-3 text-white text-xs font-medium">Clicca per ingrandire</span>
                                </div>
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">📄 Biglietto Fine Turno</p>
                              <div className="w-full h-48 rounded-xl border border-dashed border-border flex items-center justify-center bg-muted/50">
                                <p className="text-xs text-muted-foreground">Nessuna foto</p>
                              </div>
                            </div>
                          )}

                          {/* POS photo - Chiusura POS */}
                          {s.pos_photo_url ? (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">💳 Chiusura POS</p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLightboxUrl(s.pos_photo_url);
                                }}
                                className="relative group w-full"
                              >
                                <img
                                  src={s.pos_photo_url}
                                  alt="Chiusura POS"
                                  className="w-full h-48 object-cover rounded-xl border border-border group-hover:ring-2 ring-primary transition-all shadow-sm"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="bg-white/90 rounded-full p-2">
                                    <Image className="w-5 h-5 text-foreground" />
                                  </div>
                                  <span className="absolute bottom-3 text-white text-xs font-medium">Clicca per ingrandire</span>
                                </div>
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">💳 Chiusura POS</p>
                              <div className="w-full h-48 rounded-xl border border-dashed border-border flex items-center justify-center bg-muted/50">
                                <p className="text-xs text-muted-foreground">Nessuna foto</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-6 bg-background rounded-xl border border-dashed border-border">
                          <Camera className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Nessuna foto disponibile per questo turno</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center">
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-12 right-0 text-white hover:bg-white/20 rounded-full"
              onClick={() => setLightboxUrl(null)}
            >
              <X className="w-6 h-6" />
            </Button>
            <img
              src={lightboxUrl}
              alt="Foto turno"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}