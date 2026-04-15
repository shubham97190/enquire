import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import type { AdminUser } from '../types';
import * as api from '../api/endpoints';

interface AuthContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // exp is in seconds; add 10s buffer to account for clock skew
    return payload.exp * 1000 < Date.now() + 10_000;
  } catch {
    return true;
  }
}

function clearAuthStorage() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedUser = localStorage.getItem('user');
      const accessToken = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');

      if (!storedUser || !accessToken) {
        clearAuthStorage();
        setLoading(false);
        return;
      }

      if (!isTokenExpired(accessToken)) {
        // Access token still valid
        setUser(JSON.parse(storedUser));
      } else if (refreshToken && !isTokenExpired(refreshToken)) {
        // Access token expired but refresh token valid — try silent refresh
        try {
          const { data } = await axios.post('/api/admin/auth/refresh/', { refresh: refreshToken });
          localStorage.setItem('access_token', data.access);
          if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
          setUser(JSON.parse(storedUser));
        } catch {
          clearAuthStorage();
        }
      } else {
        // Both tokens expired — clear everything
        clearAuthStorage();
      }

      setLoading(false);
    };

    initAuth();

    // Listen for forced logout events dispatched by the API client
    const handleForcedLogout = () => {
      setUser(null);
    };
    window.addEventListener('auth:logout', handleForcedLogout);
    return () => window.removeEventListener('auth:logout', handleForcedLogout);
  }, []);

  const login = async (username: string, password: string) => {
    const data = await api.login(username, password);
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const logout = async () => {
    const refresh = localStorage.getItem('refresh_token');
    if (refresh) {
      try { await api.logout(refresh); } catch {}
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
