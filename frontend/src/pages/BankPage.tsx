import { useState } from 'react';
import { cashApi, useAuthStore } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { RefreshCw, Landmark, ArrowDown, ArrowUp } from 'lucide-react';

export default function BankPage() {
  const { profile } = useAuthStore();
  const isAdmin = profile?.ruolo === 'admin';

  const [bankOp, setBankOp] = useState<'deposit' | 'withdrawal'>('deposit');
  const [importo, setImporto] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!importo || parseFloat(importo) <= 0) {
      toast.error('Inserisci un importo valido');
      return;
    }
    setSubmitting(true);
    try {
      const endpoint = bankOp === 'deposit' ? '/bank-deposit' : '/bank-withdrawal';
      const label = bankOp === 'deposit' ? 'Versamento' : 'Prelievo';
      const res = await cashApi(endpoint, 'POST', {
        importo: parseFloat(importo),
        note,
      });
      if (res.success) {
        toast.success(`${label} completato!`);
        setImporto('');
        setNote('');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || 'Errore operazione bancaria');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Accesso riservato agli amministratori</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
          <Landmark className="w-8 h-8 text-primary" />Banca
        </h1>
        <p className="text-muted-foreground mt-1">Gestione versamenti e prelievi bancari</p>
      </div>

      {/* Operation Type */}
      <div className="grid grid-cols-2 gap-3">
        <Card
          className={`material-surface cursor-pointer transition-all ${bankOp === 'deposit' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setBankOp('deposit')}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${bankOp === 'deposit' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              <ArrowUp className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-sm">Versamento</p>
              <p className="text-xs text-muted-foreground">CC → Banca</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`material-surface cursor-pointer transition-all ${bankOp === 'withdrawal' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setBankOp('withdrawal')}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${bankOp === 'withdrawal' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              <ArrowDown className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-sm">Prelievo</p>
              <p className="text-xs text-muted-foreground">Banca → CC</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Form */}
      <Card className="material-surface">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            {bankOp === 'deposit' ? 'Versamento in Banca' : 'Prelievo da Banca'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-sm">Importo (€)</Label>
            <Input
              type="number" step="0.01" min="0.01"
              value={importo} onChange={(e) => setImporto(e.target.value)}
              className="rounded-2xl h-11" placeholder="0.00"
            />
          </div>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note..." className="rounded-2xl resize-none" rows={2} />
          <Button disabled={submitting} className="w-full rounded-2xl" onClick={handleSubmit}>
            {submitting && <RefreshCw className="w-4 h-4 animate-spin mr-2" />}
            Esegui {bankOp === 'deposit' ? 'Versamento' : 'Prelievo'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}