"use client";

import React, { ReactNode } from 'react';
import Link from 'next/link';
import Navbar from '../layout/Navbar';
import Footer from '../layout/Footer';

// Обёртка страниц входа, регистрации и восстановления пароля
export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="pt-16 min-h-screen bg-gray-50 flex flex-col">
        <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              {subtitle && <p className="mt-2 text-sm text-gray-600">{subtitle}</p>}
              <div className="mt-6">{children}</div>
            </div>
            {footer && <div className="mt-6 text-center text-sm text-gray-600">{footer}</div>}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null;

  return (
    <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
      {children}
    </div>
  );
}

export function FormSuccess({ children }: { children: ReactNode }) {
  if (!children) return null;

  return (
    <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
      {children}
    </div>
  );
}

export const inputClass =
  'block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 ' +
  'focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:bg-gray-50';

export const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

export const submitClass =
  'w-full rounded-md bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white ' +
  'hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 ' +
  'disabled:opacity-60 disabled:cursor-not-allowed';

export const linkClass = 'font-medium text-gray-900 underline hover:no-underline';

export { Link };
