import { supabase } from './supabase';

// ============================================
// Auth API
// ============================================

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: {
    id: number;
    user_id: string;
    nome: string;
    cognome: string;
    ruolo: string;
    status: string;
    username: string;
  };
  error?: string;
}

export async function loginWithPassword(username: string, password: string): Promise<LoginResponse> {
  try {
    // Call the Supabase Edge Function for login
    const { data, error } = await supabase.functions.invoke('login', {
      body: { username, password },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data?.success) {
      // Store token in localStorage
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_data', JSON.stringify(data.user));
      return data;
    }

    return { success: false, error: data?.error || 'Login fallito' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Errore di connessione' };
  }
}

export function logout() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_data');
}

export function getCurrentUser() {
  const userData = localStorage.getItem('user_data');
  if (userData) {
    try {
      return JSON.parse(userData);
    } catch {
      return null;
    }
  }
  return null;
}

export function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

// ============================================
// User Profiles API
// ============================================

export async function getUsers() {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('id', { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function createUser(user: {
  nome: string;
  cognome: string;
  telefono?: string;
  ruolo: string;
  status: string;
  username: string;
  password?: string;
}) {
  const { data, error } = await supabase.functions.invoke('create-user', {
    body: user,
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function updateUser(id: number, updates: Record<string, any>) {
  const { data, error } = await supabase
    .from('user_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteUser(id: number) {
  const { error } = await supabase
    .from('user_profiles')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

// ============================================
// Cashes API
// ============================================

export async function getCashes() {
  const { data, error } = await supabase
    .from('cashes')
    .select('*')
    .order('id', { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function createCash(cash: {
  name: string;
  cash_type: string;
  saldo_teorico?: number;
  status?: string;
  notes?: string;
}) {
  const { data, error } = await supabase
    .from('cashes')
    .insert({ saldo_teorico: 0, status: 'chiusa', ...cash })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateCash(id: number, updates: Record<string, any>) {
  const { data, error } = await supabase
    .from('cashes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteCash(id: number) {
  const { error } = await supabase
    .from('cashes')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

// ============================================
// VLTs API
// ============================================

export async function getVlts() {
  const { data, error } = await supabase
    .from('vlts')
    .select('*')
    .order('id', { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function createVlt(vlt: {
  codice: string;
  name: string;
  status?: string;
  notes?: string;
}) {
  const { data, error } = await supabase
    .from('vlts')
    .insert({ status: 'attiva', ...vlt })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateVlt(id: number, updates: Record<string, any>) {
  const { data, error } = await supabase
    .from('vlts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteVlt(id: number) {
  const { error } = await supabase
    .from('vlts')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

// ============================================
// BetSmarts API
// ============================================

export async function getBetsmarts() {
  const { data, error } = await supabase
    .from('betsmarts')
    .select('*')
    .order('id', { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function createBetsmart(betsmart: {
  codice: string;
  name: string;
  status?: string;
  notes?: string;
}) {
  const { data, error } = await supabase
    .from('betsmarts')
    .insert({ status: 'attivo', ...betsmart })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateBetsmart(id: number, updates: Record<string, any>) {
  const { data, error } = await supabase
    .from('betsmarts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteBetsmart(id: number) {
  const { error } = await supabase
    .from('betsmarts')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

// ============================================
// Movements API
// ============================================

export async function getMovements(filters?: {
  shift_id?: number;
  cassa_id?: number;
  user_id?: string;
  tipo_movimento?: string;
}) {
  let query = supabase
    .from('movements')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.shift_id) query = query.eq('shift_id', filters.shift_id);
  if (filters?.cassa_id) {
    query = query.or(`cassa_origine_id.eq.${filters.cassa_id},cassa_destinazione_id.eq.${filters.cassa_id}`);
  }
  if (filters?.user_id) query = query.eq('user_id', filters.user_id);
  if (filters?.tipo_movimento) query = query.eq('tipo_movimento', filters.tipo_movimento);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function createMovement(movement: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke('create-movement', {
    body: movement,
  });

  if (error) throw new Error(error.message);
  return data;
}

// ============================================
// Shifts API
// ============================================

export async function getShifts(filters?: {
  user_id?: string;
  cash_id?: number;
  status?: string;
}) {
  let query = supabase
    .from('shifts')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.user_id) query = query.eq('user_id', filters.user_id);
  if (filters?.cash_id) query = query.eq('cash_id', filters.cash_id);
  if (filters?.status) query = query.eq('status', filters.status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function openShift(shiftData: {
  user_id: string;
  user_name: string;
  user_role: string;
  cash_id: number;
  cash_name: string;
  saldo_fisico_apertura: number;
}) {
  const { data, error } = await supabase.functions.invoke('manage-shift', {
    body: { action: 'open', ...shiftData },
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function closeShift(shiftData: {
  shift_id: number;
  saldo_fisico_chiusura: number;
  note_chiusura?: string;
}) {
  const { data, error } = await supabase.functions.invoke('manage-shift', {
    body: { action: 'close', ...shiftData },
  });

  if (error) throw new Error(error.message);
  return data;
}

// ============================================
// Discrepancies API
// ============================================

export async function getDiscrepancies(filters?: {
  shift_id?: number;
  cash_id?: number;
  status?: string;
}) {
  let query = supabase
    .from('discrepancies')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.shift_id) query = query.eq('shift_id', filters.shift_id);
  if (filters?.cash_id) query = query.eq('cash_id', filters.cash_id);
  if (filters?.status) query = query.eq('status', filters.status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function updateDiscrepancy(id: number, updates: Record<string, any>) {
  const { data, error } = await supabase
    .from('discrepancies')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}