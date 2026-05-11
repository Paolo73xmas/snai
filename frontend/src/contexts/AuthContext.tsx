import React, {
  createContext,
  useContext,
  ReactNode,
} from 'react';
import { useAuthStore, type UserProfile } from '../lib/auth';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { user, profile, loading, login, logout, checkAuth } = useAuthStore();

  const value: AuthContextType = {
    user,
    profile,
    loading,
    error: null,
    login,
    logout,
    refetch: checkAuth,
    isAdmin: profile?.ruolo === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};