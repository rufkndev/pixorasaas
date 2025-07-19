//Компонент навигационной панели (Navbar)
 
// Этот файл содержит компонент навигационной панели, который отображается
// в верхней части всех страниц сайта. Навигационная панель содержит логотип,
// название сервиса и ссылки на основные разделы сайта.

"use client";

import React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../../context/AuthContext';
import LoginButton from '../../components/auth/LoginButton';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

// Компонент навигационной панели
export default function Navbar() {
  const { user, signOut, isLoading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const avatarContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Предотвращаем гидратацию, устанавливая mounted только после первого рендера
  useEffect(() => {
    setMounted(true);
  }, []);

  // Сбрасываем ошибку аватара при изменении пользователя
  useEffect(() => {
    if (user) {
      setAvatarError(false);
    }
  }, [user]);

  // Обработчик клика вне выпадающего меню
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        avatarContainerRef.current && 
        !avatarContainerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Функция для перехода в личный кабинет
  const navigateToDashboard = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropdownOpen(false);
    setIsMenuOpen(false);
    router.push('/pages/dashboard');
  }, [router]);

  // Функция для выхода из аккаунта
  const handleSignOut = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isSigningOut) return; // Предотвращаем повторные клики
    
    try {
      setIsSigningOut(true);
      setIsDropdownOpen(false);
      setIsMenuOpen(false);
      
      // Вызываем функцию выхода из контекста авторизации
      await signOut();
      
      // Дополнительная очистка состояния компонента
      setAvatarError(false);
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsSigningOut(false);
    }
  }, [signOut, isSigningOut]);

  // Компонент аватара пользователя для переиспользования
  const UserAvatar = ({ user, isMobile = false }: { user: User, isMobile?: boolean }) => {
    const userInitial = (user.user_metadata?.full_name || user.email || 'U').charAt(0).toUpperCase();
    const hasAvatar = user.user_metadata?.avatar_url && !avatarError;
    
    // Таймер для задержки закрытия выпадающего меню
    const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    const handleMouseEnter = () => {
      // Отменяем таймер закрытия, если он был установлен
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      setIsDropdownOpen(true);
    };
    
    const handleMouseLeave = () => {
      // Устанавливаем таймер для закрытия с небольшой задержкой
      closeTimeoutRef.current = setTimeout(() => {
        // Проверяем, не находится ли курсор над выпадающим меню
        const isOverDropdown = dropdownRef.current && 
          dropdownRef.current.matches(':hover');
        
        if (!isOverDropdown) {
          setIsDropdownOpen(false);
        }
      }, 100);
    };
    
    return (
      <div className={`${isMobile ? 'py-2' : 'relative'}`}>
        {isMobile ? (
          // Мобильная версия аватара
          <>
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden">
                {hasAvatar ? (
                  <Image 
                    src={user.user_metadata.avatar_url}
                    alt={user.user_metadata?.full_name || 'User'} 
                    width={32} 
                    height={32} 
                    className="object-cover"
                    onError={() => setAvatarError(true)}
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white text-sm">
                    {userInitial}
                  </div>
                )}
              </div>
              <span>{user.user_metadata?.full_name || user.email?.split('@')[0] || 'Пользователь'}</span>
            </div>
            <a 
              href="/pages/dashboard"
              onClick={navigateToDashboard}
              className="block w-full text-left py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
            >
              Мой кабинет
            </a>
            <a 
              href="#"
              onClick={handleSignOut}
              className={`block w-full text-left py-2 text-sm cursor-pointer ${
                isSigningOut 
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {isSigningOut ? 'Выход...' : 'Выйти'}
            </a>
          </>
        ) : (
          // Десктопная версия аватара
          <>
            <div 
              ref={avatarContainerRef}
              className="cursor-pointer"
              onClick={toggleDropdown}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <div className="flex items-center space-x-2 text-gray-700 hover:text-gray-900">
                <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden">
                  {hasAvatar ? (
                    <Image 
                      src={user.user_metadata.avatar_url}
                      alt={user.user_metadata?.full_name || 'User'} 
                      width={32} 
                      height={32} 
                      className="object-cover"
                      onError={() => setAvatarError(true)}
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white text-sm">
                      {userInitial}
                    </div>
                  )}
                </div>
                <span>{user.user_metadata?.full_name || user.email?.split('@')[0] || 'Пользователь'}</span>
              </div>
            </div>
            
            {isDropdownOpen && (
              <div 
                ref={dropdownRef}
                className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <a 
                  href="/pages/dashboard"
                  onClick={navigateToDashboard}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Мой кабинет
                </a>
                <a 
                  href="#"
                  onClick={handleSignOut}
                  className={`block w-full text-left px-4 py-2 text-sm cursor-pointer ${
                    isSigningOut 
                      ? 'text-gray-400 cursor-not-allowed' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {isSigningOut ? 'Выход...' : 'Выйти'}
                </a>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // Компонент скелетона для состояния загрузки
  const AuthSkeleton = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={`h-10 ${isMobile ? 'w-full' : 'w-24'} bg-gray-200 animate-pulse rounded-md`}></div>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Логотип и название сервиса */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <div className="w-8 h-8 relative mr-2">
                <Image 
                  src="/logo.svg" 
                  alt="Pixora Logo" 
                  fill 
                  className="object-contain"
                  priority
                />
              </div>
              <span className="text-xl font-bold text-gray-900">Pixora</span>
            </Link>
          </div>
          
          {/* Навигационные ссылки (отображаются только на десктопе) */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/pages/pricing" className="text-gray-700 hover:text-gray-900 transition-colors">
              Цены
            </Link>
            <Link href="/pages/about" className="text-gray-700 hover:text-gray-900 transition-colors">
              О нас
            </Link>
            
            {/* Используем mounted для предотвращения мерцания при гидратации */}
            {!mounted ? (
              <AuthSkeleton />
            ) : isLoading ? (
              <AuthSkeleton />
            ) : user ? (
              <UserAvatar user={user} />
            ) : (
              <LoginButton />
            )}
          </div>
          
          {/* Кнопка мобильного меню (отображается только на мобильных устройствах) */}
          <div className="flex items-center md:hidden">
            <button 
              onClick={toggleMenu}
              className="text-gray-700 hover:text-gray-900"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Мобильное меню */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 py-2">
          <div className="px-4 space-y-3">
            <Link 
              href="/pages/pricing" 
              className="block text-gray-700 hover:text-gray-900 py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Цены
            </Link>
            <Link 
              href="/pages/about" 
              className="block text-gray-700 hover:text-gray-900 py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              О нас
            </Link>
            
            {/* Используем mounted для предотвращения мерцания при гидратации */}
            {!mounted ? (
              <AuthSkeleton isMobile={true} />
            ) : isLoading ? (
              <AuthSkeleton isMobile={true} />
            ) : user ? (
              <UserAvatar user={user} isMobile={true} />
            ) : (
              <div className="py-2">
                <LoginButton />
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
} 