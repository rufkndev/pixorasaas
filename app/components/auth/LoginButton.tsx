"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface LoginButtonProps {
  className?: string;
}

// После входа возвращаем туда, откуда пришли: с лендинга генератора человек
// должен вернуться к форме, а не в кабинет. Со страниц входа — без next
export default function LoginButton({ className = '' }: LoginButtonProps) {
  const pathname = usePathname();
  const href =
    pathname && !pathname.startsWith('/pages/login') && !pathname.startsWith('/pages/register')
      ? `/pages/login?next=${encodeURIComponent(pathname)}`
      : '/pages/login';

  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center py-2 px-4 bg-gray-900 text-white rounded-md shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${className}`}
    >
      Войти
    </Link>
  );
}
