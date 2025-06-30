"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { createSupabaseClient, resetSupabaseClient } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

// Определяем структуру контекста аутентификации
// Этот интерфейс описывает все данные и функции, которые будут доступны через контекст
type AuthContextType = {
  user: User | null;        // Информация о текущем пользователе
  session: Session | null;  // Текущая сессия пользователя
  isLoading: boolean;      // Флаг загрузки (для отображения состояния загрузки)
  signOut: () => Promise<void>; // Функция для выхода из системы
};

// Создаем контекст с начальными значениями
// Эти значения будут использоваться, если компонент не обернут в AuthProvider
const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  signOut: async () => {},
});


// Хук для использования контекста аутентификации в компонентах
export const useAuth = () => useContext(AuthContext);

// Провайдер контекста аутентификации
// Этот компонент должен обернуть все приложение или его часть, где требуется доступ к данным аутентификации
export function AuthProvider({ children }: { children: ReactNode }) {
  // Состояния для хранения данных пользователя и сессии
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  
  // Создаем клиент Supabase только один раз при монтировании компонента
  const supabase = useMemo(() => createSupabaseClient(), []);

  // Эффект для инициализации аутентификации и подписки на изменения
  useEffect(() => {
    let mounted = true; // Флаг для предотвращения утечек памяти

    // Функция для получения текущей сессии
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        // Обновляем состояние только если компонент все еще смонтирован
        if (mounted) {
          if (session) {
            setSession(session);
            setUser(session.user);
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error getting session:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Получаем начальную сессию
    getSession();

    // Подписываемся на изменения состояния аутентификации
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setIsLoading(false);
        }
      }
    );

    // Функция очистки при размонтировании компонента
    return () => {
      mounted = false; // Предотвращаем обновление состояния после размонтирования
      subscription.unsubscribe(); // Отписываемся от событий аутентификации
    };
  }, [supabase]);

  /**
   * Функция для выхода пользователя из системы
   * Выполняет полную очистку данных аутентификации:
   * 1. Очищает локальное состояние
   * 2. Выходит из Supabase
   * 3. Очищает серверные куки
   * 4. Сбрасывает клиент Supabase
   * 5. Перенаправляет на главную страницу
   */
  const signOut = async () => {
    try {
      console.log('AuthContext: Starting sign out process');
      setIsLoading(true);
      
      // 1. Очистка состояния
      setUser(null);
      setSession(null);
      
      // 2. Выход из Supabase
      try {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error('Error during Supabase signOut:', error);
        } else {
          console.log('AuthContext: Successfully signed out from Supabase');
        }
      } catch (supabaseError) {
        console.error('Supabase signOut error:', supabaseError);
      }
      
      // 3. Вызов серверного обработчика для очистки куков
      try {
        const response = await fetch('/auth/signout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store'
        });
        
        if (response.ok) {
          console.log('AuthContext: Server-side sign out successful');
        } else {
          console.warn('AuthContext: Server-side sign out failed');
        }
      } catch (fetchError) {
        console.error('Error calling server-side sign out:', fetchError);
      }
      
      // 4. Сбрасываем экземпляр клиента Supabase
      resetSupabaseClient();
      
      // 5. Принудительное обновление страницы для сброса всего состояния
      console.log('AuthContext: Reloading page to complete sign out');
      
      // Используем простой редирект вместо сложной логики
      window.location.href = '/';
      
    } catch (error) {
      console.error('Error signing out:', error);
      // В случае ошибки все равно перенаправляем на главную
      window.location.href = '/';
    } finally {
      setIsLoading(false);
    }
  };

  // Значения, которые будут доступны через контекст
  const value = {
    user,
    session,
    isLoading,
    signOut,
  };

  // Оборачиваем дочерние компоненты в провайдер контекста
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
} 