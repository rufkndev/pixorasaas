"use client";

import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { AuthUser, authApi } from '../lib/authClient';

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signIn: async () => {
    throw new Error('AuthProvider не смонтирован');
  },
  signOut: async () => {},
  refreshUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// Сессия в httpOnly-куках, поэтому источник истины — сервер:
// при монтировании спрашиваем /api/auth/me и ничего не кэшируем.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      setUser(await authApi.me());
    } catch (error) {
      console.error('Не удалось получить профиль:', error);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const current = await authApi.me();
        if (mounted) setUser(current);
      } catch (error) {
        console.error('Не удалось получить профиль:', error);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { user: signedIn } = await authApi.login({ email, password });
    setUser(signedIn);
    return signedIn;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Даже при ошибке уводим пользователя из кабинета
      console.error('Ошибка выхода:', error);
    } finally {
      setUser(null);
      window.location.href = '/';
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
