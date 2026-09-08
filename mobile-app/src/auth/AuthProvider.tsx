import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api';
import { User } from '../types';

type AuthState = 'loading' | 'auth' | 'app';

interface AuthContextValue {
  state: AuthState;
  user: User | null;
  authenticate: (user: User) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>('loading');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const { accessToken } = await api.hydrateTokens();
        if (!accessToken) {
          if (mounted) setState('auth');
          return;
        }

        const me = await api.getMe();
        if (mounted) {
          setUser(me as User);
          setState('app');
        }
      } catch (error) {
        console.warn('Session validation failed', error);
        await api.signOut();
        if (mounted) setState('auth');
      }
    }

    void bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    state,
    user,
    authenticate: (nextUser) => {
      setUser(nextUser);
      setState('app');
    },
    signOut: async () => {
      await api.signOut();
      setUser(null);
      setState('auth');
    },
  }), [state, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
