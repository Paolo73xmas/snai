import { useAuthStore, type UserProfile } from '@/lib/auth';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  History,
  AlertTriangle,
  Users,
  LogOut,
  Menu,
  X,
  Banknote,
  Monitor,
  Tv,
  Landmark,
  Clock,
  ClockArrowDown,
  BarChart3,
  Vault,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  roles: string[];
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['admin'] },
  { icon: Wallet, label: 'Il Mio Turno', path: '/turno', roles: ['admin', 'operator', 'operator_plus'] },
  { icon: ArrowLeftRight, label: 'Operazioni', path: '/operazioni', roles: ['admin', 'operator', 'operator_plus'] },
  { icon: Vault, label: 'Cassa Centrale', path: '/cassa-centrale', roles: ['admin', 'operator_plus'] },
  { icon: Monitor, label: 'VLT', path: '/vlt', roles: ['admin', 'operator_plus'] },
  { icon: Tv, label: 'BetSmart', path: '/betsmart', roles: ['admin', 'operator_plus'] },
  { icon: Landmark, label: 'Banca', path: '/banca', roles: ['admin'] },
  { icon: History, label: 'Movimenti', path: '/movimenti', roles: ['admin', 'operator', 'operator_plus'] },
  { icon: Clock, label: 'Turni', path: '/turni', roles: ['admin'] },
  { icon: ClockArrowDown, label: 'Turni Chiusi', path: '/turni-chiusi', roles: ['admin', 'operator', 'operator_plus'] },
  { icon: AlertTriangle, label: 'Discrepanze', path: '/discrepanze', roles: ['admin'] },
  { icon: Banknote, label: 'Casse', path: '/casse', roles: ['admin'] },
  { icon: BarChart3, label: 'Report', path: '/report', roles: ['admin'] },
  { icon: Users, label: 'Utenti', path: '/utenti', roles: ['admin'] },
];

export default function AppLayout() {
  const { profile, logout, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const role = profile?.ruolo || 'operator';
  const filteredNav = navItems.filter((item) => item.roles.includes(role));
  const displayName = profile ? `${profile.nome || ''} ${profile.cognome || ''}`.trim() || profile.username : user?.email || 'Utente';

  const roleLabels: Record<string, string> = {
    admin: 'Amministratore',
    operator: 'Operatore',
    operator_plus: 'Operatore+',
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-50 h-screen w-72 bg-card border-r border-border flex flex-col transition-transform duration-300 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center">
                <Banknote className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">CashFlow</h1>
                <p className="text-xs text-muted-foreground">Gestione Casse</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
              {(displayName || 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground">{roleLabels[role] || role}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive rounded-2xl"
            onClick={logout}
          >
            <LogOut className="w-4 h-4" />
            Esci
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-h-screen">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 lg:hidden bg-card/80 backdrop-blur-xl border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="rounded-2xl">
              <Menu className="w-5 h-5" />
            </Button>
            <h2 className="text-lg font-semibold">CashFlow</h2>
          </div>
        </header>
        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}