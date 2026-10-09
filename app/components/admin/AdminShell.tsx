"use client";

import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { ApiError, apiJson } from '../../lib/authClient';
import { Spinner } from './ui';

export interface ResourceSummary {
  key: string;
  label: string;
  group: string;
}

const ResourcesContext = createContext<ResourceSummary[]>([]);
export const useAdminResources = () => useContext(ResourcesContext);

const SECTIONS = [
  { href: '/admin', label: 'Админка', match: (p: string) => p === '/admin' || p.startsWith('/admin/r') || p.startsWith('/admin/settings') },
  { href: '/admin/monitoring', label: 'Мониторинг', match: (p: string) => p.startsWith('/admin/monitoring') },
  { href: '/admin/analytics', label: 'Аналитика', match: (p: string) => p.startsWith('/admin/analytics') },
];

const GROUP_ORDER = ['Продажи', 'Клиенты', 'Контент', 'Защита', 'Журналы'];

const Sidebar = ({ resources }: { resources: ResourceSummary[] }) => {
  const pathname = usePathname() || '';
  const groups = GROUP_ORDER.map((group) => ({ group, items: resources.filter((r) => r.group === group) })).filter(
    (g) => g.items.length > 0
  );

  const item = (href: string, label: string, active: boolean) => (
    <Link
      key={href}
      href={href}
      className={`block rounded px-2 py-1.5 text-sm ${active ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="space-y-5">
      <div>{item('/admin', 'Главная', pathname === '/admin')}</div>
      {groups.map(({ group, items }) => (
        <div key={group}>
          <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{group}</div>
          {items.map((r) => item(`/admin/r/${r.key}`, r.label, pathname.startsWith(`/admin/r/${r.key}`)))}
        </div>
      ))}
      <div>
        <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Система</div>
        {item('/admin/settings', 'Настройки', pathname.startsWith('/admin/settings'))}
      </div>
    </nav>
  );
};

// Доступ проверяет сервер: здесь только понятный экран вместо пустой страницы
export default function AdminShell({ children }: { children: ReactNode }) {
  const { user, isLoading, signOut } = useAuth();
  const pathname = usePathname() || '/admin';
  const [state, setState] = useState<'loading' | 'ok' | 'denied' | 'error'>('loading');
  const [resources, setResources] = useState<ResourceSummary[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      setState('denied');
      return;
    }

    apiJson<{ resources: ResourceSummary[] }>('/api/admin/resources')
      .then((data) => {
        setResources(data.resources);
        setState('ok');
      })
      .catch((error) => setState(error instanceof ApiError && error.status === 403 ? 'denied' : 'error'));
  }, [user, isLoading]);

  useEffect(() => setMenuOpen(false), [pathname]);

  if (state === 'loading') {
    return (
      <div className="mx-auto max-w-7xl px-4">
        <Spinner />
      </div>
    );
  }

  if (state !== 'ok') {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-xl font-semibold text-gray-900">
          {state === 'error' ? 'Админка недоступна' : user ? 'Нет доступа' : 'Нужно войти'}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {state === 'error'
            ? 'Сервер не ответил. Попробуйте обновить страницу.'
            : user
              ? `Аккаунт ${user.email} не входит в ADMIN_EMAILS.`
              : 'Админка открывается только админам после входа.'}
        </p>
        {!user && (
          <Link
            href={`/pages/login?next=${encodeURIComponent(pathname)}`}
            className="mt-6 inline-block rounded-md bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Войти
          </Link>
        )}
      </div>
    );
  }

  const withSidebar = SECTIONS[0].match(pathname);

  return (
    <ResourcesContext.Provider value={resources}>
      <div className="min-h-screen bg-[#f7f7f5]">
        <header className="sticky top-0 z-30 border-b border-gray-800 bg-gray-900 text-white">
          <div className="mx-auto flex h-12 max-w-[1440px] items-center gap-4 px-4">
            {withSidebar && (
              <button
                type="button"
                className="rounded px-2 py-1 text-sm hover:bg-white/10 lg:hidden"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Меню моделей"
              >
                ☰
              </button>
            )}
            <Link href="/admin" className="shrink-0 text-sm font-semibold tracking-wide">
              Pixora <span className="hidden font-normal text-gray-400 md:inline">· управление</span>
            </Link>
            <nav className="-mr-2 flex min-w-0 flex-1 gap-1 overflow-x-auto">
              {SECTIONS.map((section) => (
                <Link
                  key={section.href}
                  href={section.href}
                  className={`whitespace-nowrap rounded px-2 py-1.5 text-sm sm:px-3 ${
                    section.match(pathname) ? 'bg-white text-gray-900' : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {section.label}
                </Link>
              ))}
            </nav>
            <div className="hidden items-center gap-3 text-xs text-gray-400 sm:flex">
              <span className="truncate">{user?.email}</span>
              <Link href="/" className="hover:text-white">
                На сайт
              </Link>
              <button type="button" onClick={() => void signOut()} className="hover:text-white">
                Выйти
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto flex max-w-[1440px] gap-6 px-4 py-6">
          {withSidebar && (
            <aside
              className={`${
                menuOpen ? 'fixed inset-0 top-12 z-20 block overflow-y-auto bg-white p-4' : 'hidden'
              } w-52 shrink-0 lg:static lg:block lg:bg-transparent lg:p-0`}
            >
              <Sidebar resources={resources} />
            </aside>
          )}
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </ResourcesContext.Provider>
  );
}
