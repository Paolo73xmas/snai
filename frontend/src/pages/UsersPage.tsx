import { useEffect, useState, useCallback } from 'react';
import { cashApi, useAuthStore } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Users,
  RefreshCw,
  Shield,
  UserCheck,
  UserCog,
  UserPlus,
} from 'lucide-react';

interface UserProfile {
  id: number;
  user_id: string;
  nome: string;
  cognome: string;
  telefono: string;
  ruolo: string;
  status: string;
  username: string;
}

const roleLabels: Record<string, string> = {
  admin: 'Amministratore',
  operator: 'Operatore',
  operator_plus: 'Operatore+',
};

const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  operator: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  operator_plus: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
};

const roleIcons: Record<string, React.ElementType> = {
  admin: Shield,
  operator: UserCheck,
  operator_plus: UserCog,
};

const statusColors: Record<string, string> = {
  attivo: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  disattivato: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

interface CreateUserForm {
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  username: string;
  ruolo: string;
  password: string;
}

const initialForm: CreateUserForm = {
  nome: '',
  cognome: '',
  email: '',
  telefono: '',
  username: '',
  ruolo: 'operator',
  password: '',
};

export default function UsersPage() {
  const { profile: currentProfile } = useAuthStore();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [changingRole, setChangingRole] = useState<{ userId: string; role: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CreateUserForm>(initialForm);
  const [creating, setCreating] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await cashApi<UserProfile[]>('/all-profiles');
      setUsers(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleRoleChange = async (targetUserId: string, newRole: string) => {
    setSubmitting(true);
    try {
      const res = await cashApi<{ success: boolean }>('/set-user-role', 'POST', {
        target_user_id: targetUserId,
        role: newRole,
      });
      if (res.success) {
        toast.success('Ruolo aggiornato!');
        setChangingRole(null);
        fetchUsers();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || 'Errore cambio ruolo');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateUser = async () => {
    if (!form.nome.trim() && !form.email.trim() && !form.username.trim()) {
      toast.error('Inserisci almeno un nome o email');
      return;
    }
    if (!form.password.trim()) {
      toast.error('La password è obbligatoria');
      return;
    }
    if (form.password.trim().length < 4) {
      toast.error('La password deve avere almeno 4 caratteri');
      return;
    }
    setCreating(true);
    try {
      const res = await cashApi<{ success: boolean; username: string; ruolo: string }>('/create-user', 'POST', {
        nome: form.nome.trim(),
        cognome: form.cognome.trim(),
        email: form.email.trim(),
        telefono: form.telefono.trim(),
        username: form.username.trim() || form.email.trim(),
        ruolo: form.ruolo,
        password: form.password.trim(),
      });
      if (res.success) {
        toast.success(`Utente "${res.username}" creato con ruolo ${roleLabels[res.ruolo] || res.ruolo}`);
        setDialogOpen(false);
        setForm(initialForm);
        fetchUsers();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || 'Errore creazione utente');
    } finally {
      setCreating(false);
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Gestione Utenti</h1>
          <p className="text-muted-foreground mt-1">{users.length} utenti registrati</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-2xl gap-2">
                <UserPlus className="w-4 h-4" />
                Crea Utente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  Crea Nuovo Utente
                </DialogTitle>
                <DialogDescription>
                  Compila i dati per creare un nuovo account utente nel sistema.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome</Label>
                    <Input
                      id="nome"
                      placeholder="Mario"
                      value={form.nome}
                      onChange={(e) => setForm({ ...form, nome: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cognome">Cognome</Label>
                    <Input
                      id="cognome"
                      placeholder="Rossi"
                      value={form.cognome}
                      onChange={(e) => setForm({ ...form, cognome: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="mario.rossi@email.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono">Telefono</Label>
                  <Input
                    id="telefono"
                    placeholder="+39 333 1234567"
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="mario.rossi (opzionale, usa email se vuoto)"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Inserisci password (min. 4 caratteri)"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ruolo">Ruolo</Label>
                  <Select value={form.ruolo} onValueChange={(v) => setForm({ ...form, ruolo: v })}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Seleziona ruolo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-purple-600" />
                          Amministratore
                        </div>
                      </SelectItem>
                      <SelectItem value="operator_plus">
                        <div className="flex items-center gap-2">
                          <UserCog className="w-4 h-4 text-indigo-600" />
                          Operatore+
                        </div>
                      </SelectItem>
                      <SelectItem value="operator">
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-blue-600" />
                          Operatore
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => { setDialogOpen(false); setForm(initialForm); }}
                  className="rounded-2xl"
                >
                  Annulla
                </Button>
                <Button
                  onClick={handleCreateUser}
                  disabled={creating}
                  className="rounded-2xl gap-2"
                >
                  {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  {creating ? 'Creazione...' : 'Crea Utente'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={fetchUsers} variant="outline" className="rounded-2xl gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Aggiorna
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="material-surface border-0">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Admin</p>
              <p className="text-lg font-bold">{users.filter((u) => u.ruolo === 'admin').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="material-surface border-0">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Operatori</p>
              <p className="text-lg font-bold">{users.filter((u) => u.ruolo === 'operator').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="material-surface border-0">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <UserCog className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Operatori+</p>
              <p className="text-lg font-bold">{users.filter((u) => u.ruolo === 'operator_plus').length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card className="material-surface">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Elenco Utenti
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Users className="w-8 h-8 mb-2" />
              <p>Nessun utente trovato</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {users.map((user) => {
                const RoleIcon = roleIcons[user.ruolo] || UserCheck;
                const isCurrentUser = user.user_id === currentProfile?.user_id;
                const isChanging = changingRole?.userId === user.user_id;

                return (
                  <div key={user.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                          {(user.nome || user.username || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">
                              {[user.nome, user.cognome].filter(Boolean).join(' ') || user.username}
                            </p>
                            {isCurrentUser && (
                              <Badge className="bg-primary/10 text-primary border-0 text-xs rounded-full">Tu</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>@{user.username}</span>
                            {user.telefono && <span>• {user.telefono}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className={`${statusColors[user.status] || 'bg-gray-100 text-gray-800'} border-0 text-xs rounded-full`}>
                          {user.status === 'attivo' ? 'Attivo' : 'Disattivato'}
                        </Badge>

                        {isChanging ? (
                          <div className="flex items-center gap-2">
                            <Select
                              value={changingRole.role}
                              onValueChange={(v) => setChangingRole({ userId: user.user_id, role: v })}
                            >
                              <SelectTrigger className="w-[160px] rounded-2xl h-9 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Amministratore</SelectItem>
                                <SelectItem value="operator">Operatore</SelectItem>
                                <SelectItem value="operator_plus">Operatore+</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              className="rounded-2xl h-9 text-xs"
                              disabled={submitting || changingRole.role === user.ruolo}
                              onClick={() => handleRoleChange(user.user_id, changingRole.role)}
                            >
                              {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Salva'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="rounded-2xl h-9 text-xs"
                              onClick={() => setChangingRole(null)}
                            >
                              Annulla
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-2xl h-9 text-xs gap-1"
                            onClick={() => setChangingRole({ userId: user.user_id, role: user.ruolo })}
                          >
                            <RoleIcon className="w-3.5 h-3.5" />
                            {roleLabels[user.ruolo] || user.ruolo}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}