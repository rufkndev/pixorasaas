"use client";

import React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../../context/AuthContext';
import LoginButton from '../../components/auth/LoginButton';
import { AuthUser } from '../../lib/authClient';
import { useRouter } from 'next/navigation';

// Отображаемое имя: полное имя, иначе часть email до @
const displayName = (user: AuthUser) =>
  user.fullName || user.email.split('@')[0] || 'Пользователь';

export default function Navbar() {
  const { user, signOut, isLoading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const avatarContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Первый рендер должен совпасть с серверным, иначе React ругается на гидратацию
  useEffect(() => {
    setMounted(true);
  }, []);

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

  const navigateToDashboard = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropdownOpen(false);
    setIsMenuOpen(false);
    router.push('/pages/dashboard');
  }, [router]);

  const handleSignOut = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isSigningOut) return; // Предотвращаем повторные клики
    
    try {
      setIsSigningOut(true);
      setIsDropdownOpen(false);
      setIsMenuOpen(false);
      
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsSigningOut(false);
    }
  }, [signOut, isSigningOut]);

  // Аватар — кружок с инициалом: внешних картинок профиля больше нет.
  // Аватар — кружок с инициалом: внешних картинок профиля больше нет.
  const UserAvatar = ({ user, isMobile = false }: { user: AuthUser, isMobile?: boolean }) => {
    const userInitial = displayName(user).charAt(0).toUpperCase();

    // Небольшая задержка, чтобы меню не закрывалось при переходе курсора на него
    const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    const handleMouseEnter = () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      setIsDropdownOpen(true);
    };
    
    const handleMouseLeave = () => {
      closeTimeoutRef.current = setTimeout(() => {
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
          <>
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-8 h-8 rounded-full overflow-hidden">
                <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white text-sm">
                  {userInitial}
                </div>
              </div>
              <span>{displayName(user)}</span>
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
          <>
            <div 
              ref={avatarContainerRef}
              className="cursor-pointer"
              onClick={toggleDropdown}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <div className="flex items-center space-x-2 text-gray-700 hover:text-gray-900">
                <div className="w-8 h-8 rounded-full overflow-hidden">
                  <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white text-sm">
                    {userInitial}
                  </div>
                </div>
                <span>{displayName(user)}</span>
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

  const AuthSkeleton = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={`h-10 ${isMobile ? 'w-full' : 'w-24'} bg-gray-200 animate-pulse rounded-md`}></div>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <div className="w-8 h-8 relative mr-2">
                <Image 
                  src="/logo.svg" 
                  alt="Pixora - создание логотипов с ИИ" 
                  fill 
                  className="object-contain"
                  priority
                />
              </div>
              <span className="text-xl font-bold text-gray-900">Pixora</span>
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/pages/pricing" className="text-gray-700 hover:text-gray-900 transition-colors">
              Цены
            </Link>
            <Link href="/pages/about" className="text-gray-700 hover:text-gray-900 transition-colors">
              О нас
            </Link>
            
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