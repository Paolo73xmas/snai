import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth';
import AuthCallback from './pages/AuthCallback';
import AuthError from './pages/AuthError';
import AppLayout from './components/AppLayout';
import AdminDashboard from './pages/AdminDashboard';
import OperatorPage from './pages/OperatorPage';
import OperationsPage from './pages/OperationsPage';
import MovementsPage from './pages/MovementsPage';
import DiscrepanciesPage from './pages/DiscrepanciesPage';
import CashesPage from './pages/CashesPage';
import UsersPage from './pages/UsersPage';
import VltPage from './pages/VltPage';
import BetSmartPage from './pages/BetSmartPage';
import BankPage from './pages/BankPage';
import ShiftsPage from './pages/ShiftsPage';
import ReportsPage from './pages/ReportsPage';
import CentralCashPage from './pages/CentralCashPage';
import LoginPage from './pages/LoginPage';

const queryClient = new QueryClient();

function AuthenticatedApp() {
  const { profile } = useAuthStore();
  const role = profile?.ruolo || 'operator';
  const isAdmin = role === 'admin';
  const isPlus = role === 'operator_plus';
  const canManage = isAdmin || isPlus;
  const defaultPath = isAdmin ? '/dashboard' : '/turno';

  return (
    <Routes>
      <Route element={<AppLayout />}>
        {isAdmin && <Route path="/dashboard" element={<AdminDashboard />} />}
        <Route path="/turno" element={<OperatorPage />} />
        <Route path="/operazioni" element={<OperationsPage />} />
        {canManage && <Route path="/cassa-centrale" element={<CentralCashPage />} />}
        {canManage && <Route path="/vlt" element={<VltPage />} />}
        {canManage && <Route path="/betsmart" element={<BetSmartPage />} />}
        {isAdmin && <Route path="/banca" element={<BankPage />} />}
        <Route path="/movimenti" element={<MovementsPage />} />
        {isAdmin && <Route path="/turni" element={<ShiftsPage />} />}
        {isAdmin && <Route path="/discrepanze" element={<DiscrepanciesPage />} />}
        {isAdmin && <Route path="/casse" element={<CashesPage />} />}
        {isAdmin && <Route path="/report" element={<ReportsPage />} />}
        {isAdmin && <Route path="/utenti" element={<UsersPage />} />}
        <Route path="*" element={<Navigate to={defaultPath} replace />} />
      </Route>
    </Routes>
  );
}

function AppContent() {
  const { user, loading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 fade-in">
          <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto">
            <div className="w-8 h-8 rounded-full border-3 border-primary border-t-transparent animate-spin" />
          </div>
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <AuthenticatedApp />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/error" element={<AuthError />} />
          <Route path="/*" element={<AppContent />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;