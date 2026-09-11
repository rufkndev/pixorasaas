"use client";

import React from 'react';
import Link from 'next/link';

interface LoginButtonProps {
  className?: string;
}

export default function LoginButton({ className = '' }: LoginButtonProps) {
  return (
    <Link
      href="/pages/login"
      className={`inline-flex items-center justify-center py-2 px-4 bg-gray-900 text-white rounded-md shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${className}`}
    >
      Войти
    </Link>
  );
}
