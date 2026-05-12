import { create } from 'zustand';
import { createClient } from '@metagptx/web-sdk';

const TOKEN_KEY = 'cashflow_token';
const USER_KEY = 'cashflow_user';
const PROFILE_KEY = 'cashflow_profile';

// Create web-sdk client for API calls
const client = createClient();

// In-memory token store (fallback when localStorage is blocked)
let memoryToken: string | null = null;

// Clear any stale keys from old Supabase-based auth
const STALE_KEYS = ['auth_token', 'user_data', 'sb-idklfzwgzvjmuqnqnqxh-auth-token'];
STALE_KEYS.forEach((key) => {
  try { localStorage.removeItem(key); } catch { /* storage blocked */ }
});
console.log('[AUTH] Module loaded, stale keys cleanup done');

/**
 * Safely decode a JWT payload, handling both standard and URL-safe base64.
 */
function safeDecodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = payload.length % 4;
    if (pad) payload += '='.repeat(4 - pad);
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

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

/**
 * Safe localStorage wrappers that handle "Tracking Prevention" blocking storage access.
 */
function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn(`[AUTH] ⚠️ localStorage.setItem("${key}") BLOCKED:`, err);
    return false;
  }
}

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (err) {
    console.warn(`[AUTH] ⚠️ localStorage.getItem("${key}") BLOCKED:`, err);
    return null;
  }
}

function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[AUTH] ⚠️ localStorage.removeItem("${key}") BLOCKED:`, err);
  }
}

/**
 * Get the current auth token from memory or localStorage.
 */
function getToken(): string | null {
  if (memoryToken) return memoryToken;
  return safeGetItem(TOKEN_KEY);
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),

  checkAuth: async () => {
    console.log('[AUTH] checkAuth called');
    try {
      set({ loading: true });

      // Check in-memory token first, then localStorage
      const token = getToken();
      const userJson = safeGetItem(USER_KEY);
      const profileJson = safeGetItem(PROFILE_KEY);

      console.log('[AUTH] checkAuth - token exists:', !!token, 'userJson exists:', !!userJson);

      if (!token) {
        // Also check if we have in-memory state from zustand
        const currentState = useAuthStore.getState();
        if (currentState.user && memoryToken) {
          console.log('[AUTH] ✅ Using in-memory auth state');
          return;
        }
        set({ user: null, profile: null });
        return;
      }

      // Verify token is still valid by checking expiry
      const payload = safeDecodeJwtPayload(token);
      if (!payload) {
        console.warn('[AUTH] ⚠️ Cannot decode token, clearing');
        memoryToken = null;
        safeRemoveItem(TOKEN_KEY);
        safeRemoveItem(USER_KEY);
        safeRemoveItem(PROFILE_KEY);
        set({ user: null, profile: null });
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        console.warn('[AUTH] ⚠️ Token expired, clearing');
        memoryToken = null;
        safeRemoveItem(TOKEN_KEY);
        safeRemoveItem(USER_KEY);
        safeRemoveItem(PROFILE_KEY);
        set({ user: null, profile: null });
        return;
      }

      // Try to restore user from localStorage or from token payload
      let user: { id: string; email: string; name?: string } | null = null;
      let profile: UserProfile | null = null;

      if (userJson) {
        try {
          user = JSON.parse(userJson);
          profile = profileJson ? JSON.parse(profileJson) : null;
        } catch {
          console.warn('[AUTH] ⚠️ Corrupted stored data, rebuilding from token');
        }
      }

      // If localStorage was blocked, reconstruct from JWT payload
      if (!user && payload) {
        user = {
          id: payload.sub || '',
          email: payload.email || '',
          name: payload.name || payload.email || '',
        };
        profile = {
          id: payload.sub || '',
          user_id: payload.sub || '',
          nome: (payload.name || '').split(' ')[0] || '',
          cognome: (payload.name || '').split(' ').slice(1).join(' ') || '',
          telefono: '',
          ruolo: (payload.role as 'admin' | 'operator' | 'operator_plus') || 'operator',
          status: 'attivo',
          username: payload.email || '',
        };
      }

      if (user) {
        console.log('[AUTH] ✅ checkAuth - valid session found for:', user.email);
        set({ user, profile });
      } else {
        set({ user: null, profile: null });
      }
    } catch (err) {
      console.error('[AUTH] ❌ checkAuth exception:', err);
      set({ user: null, profile: null });
    } finally {
      set({ loading: false });
    }
  },

  login: async () => {
    // No-op: login is handled by the LoginPage form
  },

  logout: async () => {
    console.log('[AUTH] Logout called');
    memoryToken = null;
    safeRemoveItem(TOKEN_KEY);
    safeRemoveItem(USER_KEY);
    safeRemoveItem(PROFILE_KEY);
    set({ user: null, profile: null });
  },
}));

/**
 * Login with username and password using the backend /api/v1/auth/login-password endpoint.
 * Uses web-sdk client.apiCall.invoke for production compatibility.
 */
export async function supabaseLogin(email: string, password: string): Promise<{
  success: boolean;
  profile?: UserProfile;
  error?: string;
}> {
  const requestBody = { username: email.trim(), password };

  console.log('[AUTH] ╔══════════════════════════════════════╗');
  console.log('[AUTH] ║        LOGIN FLOW START              ║');
  console.log('[AUTH] ╚══════════════════════════════════════╝');
  console.log('[AUTH] Timestamp:', new Date().toISOString());
  console.log('[AUTH] Username:', requestBody.username);
  console.log('[AUTH] Password length:', password.length);
  console.log('[AUTH] Using web-sdk client.apiCall.invoke');
  console.log('[AUTH] Target URL: /api/v1/auth/login-password');
  console.log('[AUTH] Window location:', window.location.href);
  console.log('[AUTH] localStorage available:', (() => { try { localStorage.setItem('__test__', '1'); localStorage.removeItem('__test__'); return true; } catch { return false; } })());

  try {
    console.log('[AUTH] 📡 Sending request via client.apiCall.invoke...');
    const startTime = performance.now();

    const response = await client.apiCall.invoke({
      url: '/api/v1/auth/login-password',
      method: 'POST',
      data: requestBody,
    });

    const elapsed = Math.round(performance.now() - startTime);
    console.log(`[AUTH] 📡 Response received in ${elapsed}ms`);
    console.log('[AUTH] Response type:', typeof response);
    console.log('[AUTH] Response keys:', response ? Object.keys(response) : 'null');
    console.log('[AUTH] Response.data type:', typeof response?.data);
    console.log('[AUTH] Response.data:', JSON.stringify(response?.data, null, 2));

    const data = response?.data;

    if (!data) {
      console.error('[AUTH] ❌ Empty response from login endpoint');
      console.error('[AUTH] Full response object:', JSON.stringify(response));
      return { success: false, error: 'Risposta del server vuota' };
    }

    // Check if response contains an error
    if (data.detail) {
      console.error('[AUTH] ❌ Login failed - server returned error:', data.detail);
      return { success: false, error: data.detail };
    }

    const { token, user: userData } = data;

    if (!token || !userData) {
      console.error('[AUTH] ❌ Invalid response structure - missing token or user');
      console.error('[AUTH] Has token:', !!token, '| Has user:', !!userData);
      console.error('[AUTH] Data keys:', Object.keys(data));
      return { success: false, error: 'Risposta del server non valida' };
    }

    console.log('[AUTH] ✅ Valid login response:');
    console.log('[AUTH]   Token (first 30 chars):', token.substring(0, 30) + '...');
    console.log('[AUTH]   User ID:', userData.id);
    console.log('[AUTH]   User email:', userData.email);
    console.log('[AUTH]   User name:', userData.name);
    console.log('[AUTH]   User role:', userData.role);

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

    // Store token in memory (always works, even when localStorage is blocked)
    memoryToken = token;
    console.log('[AUTH] 💾 Token stored in memory (memoryToken set)');

    // Also try localStorage (may be blocked in iframe / tracking prevention)
    const lsToken = safeSetItem(TOKEN_KEY, token);
    const lsUser = safeSetItem(USER_KEY, JSON.stringify(user));
    const lsProfile = safeSetItem(PROFILE_KEY, JSON.stringify(profile));
    console.log('[AUTH] 💾 localStorage results: token=', lsToken, 'user=', lsUser, 'profile=', lsProfile);

    // Update the zustand store (this works regardless of localStorage)
    console.log('[AUTH] 🔄 Updating zustand store...');
    useAuthStore.getState().setUser(user);
    useAuthStore.getState().setProfile(profile);

    // Verify store was updated
    const storeState = useAuthStore.getState();
    console.log('[AUTH] ✅ Store updated. Current state:');
    console.log('[AUTH]   user:', storeState.user?.email);
    console.log('[AUTH]   profile.ruolo:', storeState.profile?.ruolo);

    console.log('[AUTH] ╔══════════════════════════════════════╗');
    console.log('[AUTH] ║        LOGIN SUCCESS ✅              ║');
    console.log('[AUTH] ╚══════════════════════════════════════╝');
    return { success: true, profile };
  } catch (err: any) {
    console.error('[AUTH] ╔══════════════════════════════════════╗');
    console.error('[AUTH] ║        LOGIN EXCEPTION ❌            ║');
    console.error('[AUTH] ╚══════════════════════════════════════╝');
    console.error('[AUTH] Error type:', err?.constructor?.name || typeof err);
    console.error('[AUTH] Error message:', err?.message);
    console.error('[AUTH] Error stack:', err?.stack);
    console.error('[AUTH] Error response:', JSON.stringify(err?.response));
    console.error('[AUTH] Error response.data:', JSON.stringify(err?.response?.data));
    console.error('[AUTH] Error response.status:', err?.response?.status);
    console.error('[AUTH] Error detail:', err?.detail);
    console.error('[AUTH] Full error object:', err);

    // Handle HTTP error responses from apiCall
    const errorMessage = err?.response?.data?.detail
      || err?.detail
      || err?.message
      || 'Errore di connessione';

    console.error('[AUTH] Resolved error message:', errorMessage);

    // Map common errors
    if (errorMessage.includes('401') || errorMessage.includes('Credenziali')) {
      return { success: false, error: 'Credenziali non valide' };
    }
    if (errorMessage.includes('403')) {
      return { success: false, error: 'Account disattivato' };
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * Make an authenticated API call using web-sdk client.apiCall.invoke.
 */
export async function authenticatedFetch<T = any>(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: Record<string, any>
): Promise<T> {
  const token = getToken();
  console.log(`[AUTH-FETCH] ${method} ${url} | token exists: ${!!token} | token source: ${memoryToken ? 'memory' : 'localStorage'}`);

  if (!token) {
    console.error('[AUTH-FETCH] ❌ No auth token available (neither memory nor localStorage)');
    throw new Error('No auth session available');
  }

  try {
    const response = await client.apiCall.invoke({
      url,
      method,
      data: body || {},
      options: {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      },
    });

    console.log(`[AUTH-FETCH] ✅ ${method} ${url} - success`);
    return response?.data as T;
  } catch (err: any) {
    console.error(`[AUTH-FETCH] ❌ ${method} ${url} - error:`, err?.message || err);

    // Handle 401 - token expired
    if (err?.response?.status === 401 || err?.status === 401) {
      console.warn('[AUTH-FETCH] 🔒 401 received - clearing auth state');
      memoryToken = null;
      safeRemoveItem(TOKEN_KEY);
      safeRemoveItem(USER_KEY);
      safeRemoveItem(PROFILE_KEY);
      useAuthStore.getState().setUser(null);
      useAuthStore.getState().setProfile(null);
      throw new Error('Sessione scaduta. Effettua nuovamente il login.');
    }

    const detail = err?.response?.data?.detail || err?.detail || err?.message || 'Request failed';
    const error = new Error(detail);
    (error as any).status = err?.response?.status || err?.status;
    (error as any).detail = detail;
    throw error;
  }
}

/**
 * Public fetch (no auth required) using web-sdk
 */
export async function publicFetch<T = any>(
  url: string,
  method: 'POST' = 'POST',
  body?: Record<string, any>
): Promise<T> {
  try {
    const response = await client.apiCall.invoke({
      url,
      method,
      data: body || {},
    });

    return response?.data as T;
  } catch (err: any) {
    const detail = err?.response?.data?.detail || err?.detail || err?.message || 'Request failed';
    const error = new Error(detail);
    (error as any).status = err?.response?.status || err?.status;
    (error as any).detail = detail;
    throw error;
  }
}

// Helper to call cash-ops API
export async function cashApi<T = any>(
  url: string,
  method: 'GET' | 'POST' = 'GET',
  data: Record<string, any> = {}
): Promise<T> {
  return authenticatedFetch<T>(`/api/v1/cash-ops${url}`, method, method === 'GET' ? (Object.keys(data).length ? data : undefined) : data);
}