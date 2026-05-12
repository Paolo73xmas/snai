import { useState } from 'react';
import { supabaseLogin } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Banknote, LogIn, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[LOGIN PAGE] === Form submitted ===');
    console.log('[LOGIN PAGE] Username:', username);
    console.log('[LOGIN PAGE] Password length:', password.length);

    if (!username.trim() || !password.trim()) {
      console.warn('[LOGIN PAGE] ⚠️ Empty fields');
      toast.error('Inserisci username e password');
      return;
    }

    setLoading(true);
    try {
      console.log('[LOGIN PAGE] Calling supabaseLogin...');
      const result = await supabaseLogin(username, password);
      console.log('[LOGIN PAGE] supabaseLogin result:', { success: result.success, error: result.error, hasProfile: !!result.profile });

      if (result.success) {
        console.log('[LOGIN PAGE] ✅ Login successful! Showing toast...');
        toast.success('Accesso effettuato!');
        // The store is already updated by supabaseLogin, React will re-render
      } else {
        console.error('[LOGIN PAGE] ❌ Login failed:', result.error);
        toast.error(result.error || 'Credenziali non valide');
      }
    } catch (err: any) {
      console.error('[LOGIN PAGE] ❌ Exception during login:', err);
      toast.error(err.message || 'Errore durante il login');
    } finally {
      setLoading(false);
      console.log('[LOGIN PAGE] === Form submission complete ===');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-card border border-border rounded-2xl shadow-lg p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Banknote className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">CashFlow</h1>
            <p className="text-sm text-muted-foreground">
              Gestione Casse – Agenzia di Gioco
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username / Email</Label>
              <Input
                id="username"
                type="text"
                placeholder="Inserisci username o email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="rounded-xl h-11"
                autoComplete="username"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Inserisci password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-xl h-11 pr-10"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 gap-2 font-semibold text-base"
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
              {loading ? 'Accesso in corso...' : 'Accedi'}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-xs text-center text-muted-foreground">
            Accesso riservato al personale autorizzato
          </p>
        </div>
      </div>
    </div>
  );
}