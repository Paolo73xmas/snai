import { useEffect, useState, useCallback, useRef } from 'react';
import { cashApi, useAuthStore } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Play,
  Square,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Wallet,
  ArrowLeftRight,
  Clock,
  Camera,
  X,
} from 'lucide-react';

interface ShiftData {
  id?: number;
  active?: boolean;
  cash_id?: number;
  cash_name?: string;
  opened_at?: string;
  saldo_teorico_apertura?: number;
  saldo_fisico_apertura?: number;
  discrepanza_apertura?: number;
  saldo_teorico_corrente?: number;
  totale_incassi?: number;
  totale_pagamenti?: number;
  totale_sovvenzioni?: number;
  totale_restituzioni?: number;
  totale_svuotamenti?: number;
  status?: string;
}

interface CashOption {
  id: number;
  name: string;
  saldo_teorico: number;
  status: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
}

export default function OperatorPage() {
  const { profile } = useAuthStore();
  const [shift, setShift] = useState<ShiftData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cashes, setCashes] = useState<CashOption[]>([]);

  // Open shift form
  const [selectedCash, setSelectedCash] = useState('');
  const [saldoFisico, setSaldoFisico] = useState('');
  const [openNote, setOpenNote] = useState('');
  const [opening, setOpening] = useState(false);

  // Close shift form
  const [closeSaldoFisico, setCloseSaldoFisico] = useState('');
  const [closeNote, setCloseNote] = useState('');
  const [closing, setClosing] = useState(false);

  // Receipt photo for shift closure
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [receiptObjectKey, setReceiptObjectKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // POS closure photo
  const [posFile, setPosFile] = useState<File | null>(null);
  const [posPreview, setPosPreview] = useState<string | null>(null);
  const [posObjectKey, setPosObjectKey] = useState<string | null>(null);

  // Camera streaming state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<'receipt' | 'pos'>('receipt');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Income form - per-category state
  const [incAmounts, setIncAmounts] = useState<Record<string, string>>({});
  const [recordingInc, setRecordingInc] = useState<string | null>(null);

  // Payment form - per-category state
  const [pagAmounts, setPagAmounts] = useState<Record<string, string>>({});
  const [recordingPag, setRecordingPag] = useState<string | null>(null);

  // Shared note for all operations
  const [operationNote, setOperationNote] = useState('');
  const [savingAll, setSavingAll] = useState(false);

  const fetchShift = useCallback(async () => {
    try {
      const res = await cashApi<ShiftData>('/my-shift');
      setShift(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCashes = useCallback(async () => {
    try {
      const res = await cashApi<CashOption[]>('/available-cashes');
      setCashes(res);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchShift();
    fetchCashes();
    const interval = setInterval(fetchShift, 15000);
    return () => clearInterval(interval);
  }, [fetchShift, fetchCashes]);

  const handleOpenShift = async () => {
    if (!selectedCash || !saldoFisico) {
      toast.error('Seleziona una cassa e inserisci il saldo fisico');
      return;
    }
    setOpening(true);
    try {
      const res = await cashApi('/open-shift', 'POST', {
        cash_id: parseInt(selectedCash),
        saldo_fisico: parseFloat(saldoFisico),
        note: openNote,
      });
      if (res.success) {
        toast.success('Turno aperto con successo!');
        if (res.discrepanza !== 0) {
          toast.warning(`Discrepanza rilevata: ${formatCurrency(res.discrepanza)}`);
        }
        setSelectedCash('');
        setSaldoFisico('');
        setOpenNote('');
        fetchShift();
        fetchCashes();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || 'Errore apertura turno');
    } finally {
      setOpening(false);
    }
  };

  const handleReceiptSelect = (file: File | null) => {
    if (!file) return;
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Seleziona un file immagine valido');
      return;
    }
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Immagine troppo grande (max 10MB)');
      return;
    }
    setReceiptFile(file);
    setReceiptObjectKey(null);
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setReceiptPreview(previewUrl);
  };

  const handleRemoveReceipt = () => {
    if (receiptPreview) {
      URL.revokeObjectURL(receiptPreview);
    }
    setReceiptFile(null);
    setReceiptPreview(null);
    setReceiptObjectKey(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePos = () => {
    if (posPreview) {
      URL.revokeObjectURL(posPreview);
    }
    setPosFile(null);
    setPosPreview(null);
    setPosObjectKey(null);
  };

  // Camera streaming functions
  const openCamera = async (target: 'receipt' | 'pos' = 'receipt') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setCameraStream(stream);
      setCameraOpen(true);
      setCameraTarget(target);
      setCapturedImage(null);
      // Attach stream to video element after render
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch (err: any) {
      console.error('[CAMERA] Error opening camera:', err);
      if (err.name === 'NotAllowedError') {
        toast.error('Permesso fotocamera negato. Consenti l\'accesso alla fotocamera nelle impostazioni del browser.');
      } else if (err.name === 'NotFoundError') {
        toast.error('Nessuna fotocamera trovata sul dispositivo.');
      } else {
        toast.error('Impossibile aprire la fotocamera: ' + (err.message || 'errore sconosciuto'));
      }
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    // Pause video while reviewing
    video.pause();
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    if (videoRef.current && cameraStream) {
      videoRef.current.play().catch(() => {});
    }
  };

  const confirmPhoto = () => {
    if (!capturedImage) return;
    // Convert data URL to File
    const byteString = atob(capturedImage.split(',')[1]);
    const mimeType = 'image/jpeg';
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeType });
    const file = new File([blob], `${cameraTarget}_${Date.now()}.jpg`, { type: mimeType });

    if (cameraTarget === 'pos') {
      setPosFile(file);
      setPosObjectKey(null);
      setPosPreview(capturedImage);
    } else {
      setReceiptFile(file);
      setReceiptObjectKey(null);
      setReceiptPreview(capturedImage);
    }
    closeCamera();
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setCameraOpen(false);
    setCapturedImage(null);
  };

  const uploadPhoto = async (file: File, prefix: string): Promise<string | null> => {
    setUploadingPhoto(true);
    try {
      const timestamp = Date.now();
      const ext = file.name.split('.').pop() || 'jpg';
      const objectKey = `${prefix}-shift-${shift?.id || 'unknown'}-${timestamp}.${ext}`;

      // Get upload URL using authenticated API call
      const uploadRes = await cashApi<{ upload_url: string }>('/upload-receipt-url', 'POST', {
        bucket_name: 'shift-receipts',
        object_key: objectKey,
      });

      const uploadUrl = uploadRes?.upload_url;
      if (!uploadUrl) {
        throw new Error('Impossibile ottenere URL di upload');
      }

      // Upload the file directly to the presigned URL
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      return objectKey;
    } catch (err: any) {
      console.error(`[UPLOAD] ${prefix} upload error:`, err);
      toast.error('Errore durante il caricamento della foto');
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const uploadReceiptPhoto = async (): Promise<string | null> => {
    if (!receiptFile) return null;
    if (receiptObjectKey) return receiptObjectKey;
    const key = await uploadPhoto(receiptFile, 'receipt');
    if (key) setReceiptObjectKey(key);
    return key;
  };

  const uploadPosPhoto = async (): Promise<string | null> => {
    if (!posFile) return null;
    if (posObjectKey) return posObjectKey;
    const key = await uploadPhoto(posFile, 'pos-closure');
    if (key) setPosObjectKey(key);
    return key;
  };

  const handleCloseShift = async () => {
    if (!closeSaldoFisico) {
      toast.error('Inserisci il saldo fisico');
      return;
    }
    if (!receiptFile) {
      toast.error('Devi allegare la foto del Biglietto di Fine Turno');
      return;
    }
    if (!posFile) {
      toast.error('Devi allegare la foto della Chiusura POS');
      return;
    }

    setClosing(true);
    try {
      // Upload both photos
      const receiptKey = await uploadReceiptPhoto();
      if (!receiptKey) {
        setClosing(false);
        return;
      }
      const posKey = await uploadPosPhoto();
      if (!posKey) {
        setClosing(false);
        return;
      }

      const res = await cashApi('/close-shift', 'POST', {
        saldo_fisico: parseFloat(closeSaldoFisico),
        note: closeNote,
        receipt_photo_key: receiptKey,
        pos_photo_key: posKey,
      });
      if (res.success) {
        toast.success('Turno chiuso con successo!');
        if (res.discrepanza !== 0) {
          toast.warning(`Discrepanza: ${formatCurrency(res.discrepanza)}`);
        }
        setCloseSaldoFisico('');
        setCloseNote('');
        handleRemoveReceipt();
        handleRemovePos();
        fetchShift();
        fetchCashes();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || 'Errore chiusura turno');
    } finally {
      setClosing(false);
    }
  };

  const handleRecordIncome = async (categoria: string) => {
    const importo = incAmounts[categoria];
    if (!importo || parseFloat(importo) <= 0) {
      toast.error('Inserisci un importo valido');
      return;
    }
    setRecordingInc(categoria);
    try {
      const res = await cashApi('/record-income', 'POST', {
        categoria,
        importo: parseFloat(importo),
        note: operationNote,
      });
      if (res.success) {
        toast.success('Incasso registrato!');
        setIncAmounts((prev) => ({ ...prev, [categoria]: '' }));
        fetchShift();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || 'Errore registrazione incasso');
    } finally {
      setRecordingInc(null);
    }
  };

  const handleRecordPayment = async (categoria: string) => {
    const importo = pagAmounts[categoria];
    if (!importo || parseFloat(importo) <= 0) {
      toast.error('Inserisci un importo valido');
      return;
    }
    setRecordingPag(categoria);
    try {
      const res = await cashApi('/record-payment', 'POST', {
        categoria,
        importo: parseFloat(importo),
        note: operationNote,
      });
      if (res.success) {
        toast.success('Pagamento registrato!');
        setPagAmounts((prev) => ({ ...prev, [categoria]: '' }));
        fetchShift();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || 'Errore registrazione pagamento');
    } finally {
      setRecordingPag(null);
    }
  };

  const handleSaveAll = async () => {
    const operazioni: { tipo: string; categoria: string; importo: number }[] = [];

    // Collect all filled income amounts
    for (const [categoria, importo] of Object.entries(incAmounts)) {
      const val = parseFloat(importo);
      if (val > 0) {
        operazioni.push({ tipo: 'incasso', categoria, importo: val });
      }
    }

    // Collect all filled payment amounts
    for (const [categoria, importo] of Object.entries(pagAmounts)) {
      const val = parseFloat(importo);
      if (val > 0) {
        operazioni.push({ tipo: 'pagamento', categoria, importo: val });
      }
    }

    if (operazioni.length === 0) {
      toast.error('Inserisci almeno un importo da salvare');
      return;
    }

    setSavingAll(true);
    try {
      const res = await cashApi<{ success: boolean; recorded: number; errors: { tipo: string; categoria: string; error: string }[] }>('/record-batch', 'POST', {
        operazioni,
        note: operationNote,
      });
      if (res.success) {
        toast.success(`${res.recorded} operazion${res.recorded === 1 ? 'e' : 'i'} registrat${res.recorded === 1 ? 'a' : 'e'} con successo!`);
        setIncAmounts({});
        setPagAmounts({});
        setOperationNote('');
        fetchShift();
      } else {
        toast.warning(`${res.recorded} registrate, ${res.errors.length} errori`);
        // Clear only successful ones
        const errorCategories = new Set(res.errors.map((e) => `${e.tipo}:${e.categoria}`));
        setIncAmounts((prev) => {
          const next: Record<string, string> = {};
          for (const [k, v] of Object.entries(prev)) {
            if (errorCategories.has(`incasso:${k}`)) next[k] = v;
          }
          return next;
        });
        setPagAmounts((prev) => {
          const next: Record<string, string> = {};
          for (const [k, v] of Object.entries(prev)) {
            if (errorCategories.has(`pagamento:${k}`)) next[k] = v;
          }
          return next;
        });
        fetchShift();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || 'Errore salvataggio batch');
    } finally {
      setSavingAll(false);
    }
  };

  const incomeCategories = [
    { value: 'scommesse_sportive', label: 'Scommesse Sportive' },
    { value: 'scommesse_ippiche', label: 'Scommesse Ippiche' },
    { value: 'scommesse_virtuali', label: 'Scommesse Virtuali' },
    { value: 'ricariche', label: 'Ricariche' },
    { value: 'paymat', label: 'PayMat' },
    { value: 'voucher_betsmart', label: 'Voucher BetSmart' },
  ];

  const paymentCategories = [
    { value: 'scommesse_sportive', label: 'Scommesse Sportive' },
    { value: 'scommesse_ippiche', label: 'Scommesse Ippiche' },
    { value: 'scommesse_virtuali', label: 'Scommesse Virtuali' },
    { value: 'vlt', label: 'VLT' },
    { value: 'prelievi_web', label: 'Prelievi Web' },
    { value: 'paymat', label: 'PayMat' },
    { value: 'annulli', label: 'Annulli' },
    { value: 'pos', label: 'POS' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasActiveShift = shift && shift.id && shift.status === 'aperto';

  return (
    <div className="space-y-6 fade-in max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Il Mio Turno</h1>
          <p className="text-muted-foreground mt-1">
            {profile ? `${profile.nome || ''} ${profile.cognome || ''}`.trim() || profile.username : 'Operatore'}
          </p>
        </div>
        <Button onClick={() => { fetchShift(); fetchCashes(); }} variant="outline" className="rounded-2xl gap-2">
          <RefreshCw className="w-4 h-4" />
          Aggiorna
        </Button>
      </div>

      {hasActiveShift ? (
        <>
          {/* Shift Summary */}
          <Card className="material-surface-elevated border-0 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Turno in Corso
                </CardTitle>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0 rounded-full">
                  {shift.cash_name}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-2">
                <div className="text-center p-3 rounded-2xl bg-white/50 dark:bg-white/5">
                  <Wallet className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Saldo Corrente</p>
                  <p className="font-bold text-lg">{formatCurrency(shift.saldo_teorico_corrente || 0)}</p>
                </div>
                <div className="text-center p-3 rounded-2xl bg-white/50 dark:bg-white/5">
                  <TrendingUp className="w-5 h-5 text-green-600 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Incassi</p>
                  <p className="font-bold text-green-600">{formatCurrency(shift.totale_incassi || 0)}</p>
                </div>
                <div className="text-center p-3 rounded-2xl bg-white/50 dark:bg-white/5">
                  <TrendingDown className="w-5 h-5 text-red-600 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Pagamenti</p>
                  <p className="font-bold text-red-600">{formatCurrency(shift.totale_pagamenti || 0)}</p>
                </div>
                <div className="text-center p-3 rounded-2xl bg-white/50 dark:bg-white/5">
                  <ArrowLeftRight className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Sovvenzioni</p>
                  <p className="font-bold text-blue-600">{formatCurrency(shift.totale_sovvenzioni || 0)}</p>
                </div>
                <div className="text-center p-3 rounded-2xl bg-white/50 dark:bg-white/5">
                  <ArrowLeftRight className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Restituzioni</p>
                  <p className="font-bold text-orange-600">{formatCurrency(shift.totale_restituzioni || 0)}</p>
                </div>
                <div className="text-center p-3 rounded-2xl bg-white/50 dark:bg-white/5">
                  <ArrowLeftRight className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Svuotamenti</p>
                  <p className="font-bold text-purple-600">{formatCurrency(shift.totale_svuotamenti || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Unified Income & Payment - All categories visible */}
          <Card className="material-surface">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Registra Operazioni</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Income Column */}
                <div className="space-y-3 p-4 rounded-2xl bg-green-50/50 dark:bg-green-950/20 border border-green-200/50 dark:border-green-800/30">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold mb-2">
                    <TrendingUp className="w-5 h-5" />
                    <span>Incassi</span>
                  </div>
                  {incomeCategories.map((cat) => (
                    <div key={cat.value} className="p-3 rounded-xl bg-white/60 dark:bg-white/5 border border-green-100 dark:border-green-900/30 space-y-2">
                      <p className="text-sm font-medium text-foreground">{cat.label}</p>
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={incAmounts[cat.value] || ''}
                            onChange={(e) => setIncAmounts((prev) => ({ ...prev, [cat.value]: e.target.value }))}
                            placeholder="€ 0.00"
                            className="rounded-xl h-10 text-sm"
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleRecordIncome(cat.value)}
                          disabled={recordingInc === cat.value}
                          className="rounded-xl h-10 px-3 bg-green-600 hover:bg-green-700 text-white shrink-0"
                        >
                          {recordingInc === cat.value ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Payment Column */}
                <div className="space-y-3 p-4 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-800/30">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-semibold mb-2">
                    <TrendingDown className="w-5 h-5" />
                    <span>Pagamenti</span>
                  </div>
                  {paymentCategories.map((cat) => (
                    <div key={cat.value} className="p-3 rounded-xl bg-white/60 dark:bg-white/5 border border-red-100 dark:border-red-900/30 space-y-2">
                      <p className="text-sm font-medium text-foreground">{cat.label}</p>
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={pagAmounts[cat.value] || ''}
                            onChange={(e) => setPagAmounts((prev) => ({ ...prev, [cat.value]: e.target.value }))}
                            placeholder="€ 0.00"
                            className="rounded-xl h-10 text-sm"
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleRecordPayment(cat.value)}
                          disabled={recordingPag === cat.value}
                          variant="destructive"
                          className="rounded-xl h-10 px-3 shrink-0"
                        >
                          {recordingPag === cat.value ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TrendingDown className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Single shared note field */}
              <div className="mt-4 space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Note</Label>
                <Textarea
                  value={operationNote}
                  onChange={(e) => setOperationNote(e.target.value)}
                  placeholder="Note operazione..."
                  className="rounded-xl resize-none text-sm"
                  rows={2}
                />
              </div>

              {/* Save All Button */}
              <div className="mt-6 flex justify-center">
                <Button
                  onClick={handleSaveAll}
                  disabled={savingAll}
                  size="lg"
                  className="rounded-2xl h-14 px-8 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg gap-2 w-full sm:w-auto"
                >
                  {savingAll ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Wallet className="w-5 h-5" />
                  )}
                  Salva Tutto
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Close Shift */}
          <Card className="material-surface border-amber-200 dark:border-amber-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Square className="w-5 h-5" />
                Chiudi Turno
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Saldo teorico corrente: <strong>{formatCurrency(shift.saldo_teorico_corrente || 0)}</strong>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Saldo Fisico Dichiarato (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={closeSaldoFisico}
                    onChange={(e) => setCloseSaldoFisico(e.target.value)}
                    placeholder="0.00"
                    className="rounded-2xl h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Note (obbligatorie se discrepanza)</Label>
                  <Textarea
                    value={closeNote}
                    onChange={(e) => setCloseNote(e.target.value)}
                    placeholder="Note chiusura..."
                    className="rounded-2xl resize-none"
                    rows={2}
                  />
                </div>
              </div>

              {/* Receipt Photo Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3 p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30">
                  <Label className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold">
                    <Camera className="w-4 h-4" />
                    Foto Biglietto Fine Turno <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Scatta la foto del biglietto stampato dal terminale SNAI.
                  </p>

                  {receiptPreview ? (
                    <div className="relative inline-block">
                      <img
                        src={receiptPreview}
                        alt="Anteprima biglietto"
                        className="w-full h-auto max-h-48 object-contain rounded-xl border border-amber-200 dark:border-amber-700 shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveReceipt}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                        aria-label="Rimuovi foto"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      {uploadingPhoto && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
                          <RefreshCw className="w-6 h-6 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openCamera('receipt')}
                      className="w-full h-20 rounded-2xl border-dashed border-2 border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 flex flex-col items-center gap-1"
                    >
                      <Camera className="w-6 h-6 text-amber-600" />
                      <span className="text-xs text-amber-700 dark:text-amber-400">Scatta Foto</span>
                    </Button>
                  )}
                </div>

                {/* POS Closure Photo Section */}
                <div className="space-y-3 p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/30">
                  <Label className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-semibold">
                    <Camera className="w-4 h-4" />
                    Foto Chiusura POS <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Scatta la foto della chiusura POS.
                  </p>

                  {posPreview ? (
                    <div className="relative inline-block">
                      <img
                        src={posPreview}
                        alt="Anteprima chiusura POS"
                        className="w-full h-auto max-h-48 object-contain rounded-xl border border-blue-200 dark:border-blue-700 shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={handleRemovePos}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                        aria-label="Rimuovi foto POS"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      {uploadingPhoto && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
                          <RefreshCw className="w-6 h-6 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openCamera('pos')}
                      className="w-full h-20 rounded-2xl border-dashed border-2 border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 flex flex-col items-center gap-1"
                    >
                      <Camera className="w-6 h-6 text-blue-600" />
                      <span className="text-xs text-blue-700 dark:text-blue-400">Scatta Foto</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Hidden file input (kept for potential future use) */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleReceiptSelect(e.target.files?.[0] || null)}
              />
              {/* Hidden canvas for photo capture */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Camera Streaming Modal */}
              {cameraOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                  <div className="relative w-full max-w-lg mx-4 bg-background rounded-3xl overflow-hidden shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Camera className="w-5 h-5 text-primary" />
                        {cameraTarget === 'pos' ? 'Scatta Foto Chiusura POS' : 'Scatta Foto Biglietto'}
                      </h3>
                      <button
                        type="button"
                        onClick={closeCamera}
                        className="p-2 rounded-full hover:bg-muted transition-colors"
                        aria-label="Chiudi fotocamera"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Video / Captured Image */}
                    <div className="relative aspect-[4/3] bg-black">
                      {capturedImage ? (
                        <img
                          src={capturedImage}
                          alt="Foto scattata"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>

                    {/* Controls */}
                    <div className="p-4 flex items-center justify-center gap-4">
                      {capturedImage ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={retakePhoto}
                            className="rounded-2xl px-6 gap-2"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Riprova
                          </Button>
                          <Button
                            type="button"
                            onClick={confirmPhoto}
                            className="rounded-2xl px-6 gap-2 bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Camera className="w-4 h-4" />
                            Conferma
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          onClick={capturePhoto}
                          className="rounded-full w-16 h-16 bg-white hover:bg-gray-100 border-4 border-primary shadow-lg"
                          aria-label="Scatta foto"
                        >
                          <div className="w-10 h-10 rounded-full bg-primary" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={handleCloseShift}
                disabled={closing || uploadingPhoto || !receiptFile || !posFile}
                variant="destructive"
                className="w-full material-button"
              >
                {closing || uploadingPhoto ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Square className="w-4 h-4 mr-2" />
                )}
                {uploadingPhoto ? 'Caricamento foto...' : 'Chiudi Turno'}
              </Button>
            </CardContent>
          </Card>
        </>
      ) : (
        /* Open Shift */
        <Card className="material-surface-elevated">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Play className="w-5 h-5 text-primary" />
              Apri Turno
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Seleziona una cassa libera e dichiara il saldo fisico per iniziare.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cassa</Label>
                <Select value={selectedCash} onValueChange={setSelectedCash}>
                  <SelectTrigger className="rounded-2xl h-12">
                    <SelectValue placeholder="Seleziona cassa" />
                  </SelectTrigger>
                  <SelectContent>
                    {cashes.filter((c) => c.status === 'libera').map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.name} ({formatCurrency(c.saldo_teorico)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Saldo Fisico Dichiarato (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={saldoFisico}
                  onChange={(e) => setSaldoFisico(e.target.value)}
                  placeholder="0.00"
                  className="rounded-2xl h-12"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Note (obbligatorie se discrepanza)</Label>
              <Textarea
                value={openNote}
                onChange={(e) => setOpenNote(e.target.value)}
                placeholder="Note apertura..."
                className="rounded-2xl resize-none"
                rows={2}
              />
            </div>
            <Button
              onClick={handleOpenShift}
              disabled={opening}
              className="w-full material-button"
            >
              {opening ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              Apri Turno
            </Button>

            {cashes.filter((c) => c.status === 'libera').length === 0 && (
              <p className="text-sm text-amber-600 text-center">Nessuna cassa disponibile al momento.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}