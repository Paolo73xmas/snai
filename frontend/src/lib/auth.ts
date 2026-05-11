import { create } from 'zustand';

const TOKEN_KEY = 'cashflow_token';
const USER_KEY = 'cashflow_user';
const PROFILE_KEY = 'cashflow_profile';

export interface UserProfile {
  id: string;
  user_id: string;
  nome: string;
  cognome: string;
  telefono: string;
  ruolo: 'admin' | 'operator' | 'operator_plus';
  status: string;
  username: string;
}

interface AuthState {
  user: { id: string; email: string; name?: string } | null;
  profile: UserProfile | null;
  loading: boolean;
  setUser: (user: { id: string; email: string; name?: string } | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  checkAuth: () => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),

  checkAuth: async () => {
    try {
      set({ loading: true });

      // Check for stored token and user data
      const token = localStorage.getItem(TOKEN_KEY);
      const userJson = localStorage.getItem(USER_KEY);
      const profileJson = localStorage.getItem(PROFILE_KEY);

      if (!token || !userJson) {
        set({ user: null, profile: null });
        return;
      }

      // Parse stored data
      const user = JSON.parse(userJson);
      const profile = profileJson ? JSON.parse(profileJson) : null;

      // Verify token is still valid by checking expiry
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
          // Token expired, clear storage
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          localStorage.removeItem(PROFILE_KEY);
          set({ user: null, profile: null });
          return;
        }
      } catch {
        // If we can't decode the token, clear it
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(PROFILE_KEY);
        set({ user: null, profile: null });
        return;
      }

      set({ user, profile });
    } catch {
      set({ user: null, profile: null });
    } finally {
      set({ loading: false });
    }
  },

  login: async () => {
    // No-op: login is handled by the LoginPage form
  },

  logout: async () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(PROFILE_KEY);
    set({ user: null, profile: null });
  },
}));

/**
 * Login with username and password using the backend /public/login endpoint.
 */
export async function supabaseLogin(email: string, password: string): Promise<{
  success: boolean;
  profile?: UserProfile;
  error?: string;
}> {
  try {
    const response = await fetch('/public/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: email.trim(), password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Errore di connessione' }));
      const errorMsg = errorData.detail || `HTTP ${response.status}`;

      if (response.status === 401) {
        return { success: false, error: 'Credenziali non valide' };
      }
      if (response.status === 403) {
        return { success: false, error: errorMsg };
      }
      return { success: false, error: errorMsg };
    }

    const data = await response.json();

    // data: { token, expires_at, token_type, user: { id, email, name, role } }
    const { token, user: userData } = data;

    if (!token || !userData) {
      return { success: false, error: 'Risposta del server non valida' };
    }

    // Build profile from response
    const profile: UserProfile = {
      id: userData.id,
      user_id: userData.id,
      nome: userData.name?.split(' ')[0] || '',
      cognome: userData.name?.split(' ').slice(1).join(' ') || '',
      telefono: '',
      ruolo: userData.role as 'admin' | 'operator' | 'operator_plus',
      status: 'attivo',
      username: userData.email,
    };

    const user = {
      id: userData.id,
      email: userData.email,
      name: userData.name || userData.email,
    };

    // Store in localStorage
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));

    // Update the store
    useAuthStore.getState().setUser(user);
    useAuthStore.getState().setProfile(profile);

    return { success: true, profile };
  } catch (err: any) {
    return { success: false, error: err.message || 'Errore di connessione' };
  }
}

/**
 * Make an authenticated fetch call using stored JWT token.
 */
export async function authenticatedFetch<T = any>(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: Record<string, any>
): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    throw new Error('No auth session available');
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  let fetchUrl = url;
  if (body && method === 'GET') {
    const params = new URLSearchParams();
    Object.entries(body).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    const queryString = params.toString();
    if (queryString) {
      fetchUrl = `${url}?${queryString}`;
    }
  }

  const response = await fetch(fetchUrl, options);

  if (response.status === 401) {
    // Token expired or invalid, clear auth state
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(PROFILE_KEY);
    useAuthStore.getState().setUser(null);
    useAuthStore.getState().setProfile(null);
    throw new Error('Sessione scaduta. Effettua nuovamente il login.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    const error = new Error(errorData.detail || `HTTP ${response.status}`);
    (error as any).status = response.status;
    (error as any).detail = errorData.detail;
    throw error;
  }

  return response.json();
}

/**
 * Public fetch (no auth required)
 */
export async function publicFetch<T = any>(
  url: string,
  method: 'POST' = 'POST',
  body?: Record<string, any>
): Promise<T> {
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    const error = new Error(errorData.detail || `HTTP ${response.status}`);
    (error as any).status = response.status;
    (error as any).detail = errorData.detail;
    throw error;
  }

  return response.json();
}

// Helper to call cash-ops API
export async function cashApi<T = any>(
  url: string,
  method: 'GET' | 'POST' = 'GET',
  data: Record<string, any> = {}
): Promise<T> {
  return authenticatedFetch<T>(`/api/v1/cash-ops${url}`, method, method === 'GET' ? (Object.keys(data).length ? data : undefined) : data);
}