"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiJson } from '../lib/authClient';
import { Badge, Card, ErrorBox, fmtDate, fmtMoney, Spinner, Stat, Table, Td, Th } from '../components/admin/ui';

interface Home {
  counts: Record<string, number>;
  recentOrders: Array<{
    order_id: string;
    product_type: string;
    amount: string;
    status: string;
    delivery_status: string;
    created_at: string;
    name: string | null;
  }>;
  recentActions: Array<{ created_at: string; admin_email: string; action: string; target_type: string; target_id: string | null }>;
  freePaused: boolean;
}

const orderBadge = (status: string, delivery: string) => {
  if (status !== 'succeeded') return <Badge tone={status === 'canceled' ? 'muted' : 'warn'}>{status === 'canceled' ? 'отменён' : 'ожидает'}</Badge>;
  if (delivery === 'completed') return <Badge tone="ok">выдан</Badge>;
  if (delivery === 'failed') return <Badge tone="fail">сбой выдачи</Badge>;
  return <Badge tone="info">выдаётся</Badge>;
};

export default function AdminHome() {
  const [data, setData] = useState<Home | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    apiJson<Home>('/api/admin/home')
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(load, [load]);

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!data) return <Spinner />;

  const c = data.counts;
  const attention = [
    { label: 'Оплачено, но не выдано', value: c.undelivered, href: '/admin/r/payments?f_problem=undelivered', tone: 'fail' as const },
    { label: 'Попытки выдачи исчерпаны', value: c.exhausted, href: '/admin/r/payments?f_problem=exhausted', tone: 'fail' as const },
    { label: 'Брендбук готов, письмо не ушло', value: c.no_email, href: '/admin/r/brandbooks?f_email=missing', tone: 'warn' as const },
    { label: 'Новые обращения', value: c.messages, href: '/admin/r/messages?f_state=new', tone: 'warn' as const },
    { label: 'Ошибок в логах за сутки', value: c.errors24h, href: '/admin/monitoring?tab=logs', tone: 'warn' as const },
  ];
  const urgent = attention.filter((item) => item.value > 0);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Главная</h1>

      {data.freePaused && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          ▲ Бесплатные генерации сейчас на паузе. Включить обратно — в{' '}
          <Link href="/admin/settings" className="font-medium underline">
            настройках
          </Link>
          .
        </div>
      )}

      <Card title="Требует внимания">
        {urgent.length === 0 ? (
          <p className="text-sm text-emerald-700">● Всё спокойно: невыданных заказов, новых обращений и ошибок нет.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {urgent.map((item) => (
              <Stat key={item.label} label={item.label} value={item.value} tone={item.tone} href={item.href} hint="открыть →" />
            ))}
          </div>
        )}
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Сегодня (по Москве)</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Stat label="Выручка" value={fmtMoney(c.revenue)} />
          <Stat label="Заказов" value={c.orders} />
          <Stat label="Регистраций" value={c.registrations} />
          <Stat label="Логотипов" value={c.logos} />
          <Stat label="Генераций названий" value={c.names} />
          <Stat label="Всего пользователей" value={c.users_total.toLocaleString('ru-RU')} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Последние заказы" action={<Link href="/admin/r/payments" className="text-xs text-sky-700 hover:underline">все заказы →</Link>} padded={false}>
          <Table>
            <thead>
              <tr>
                <Th>Бренд</Th>
                <Th>Товар</Th>
                <Th right>Сумма</Th>
                <Th>Статус</Th>
                <Th>Создан</Th>
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.map((order) => (
                <tr key={order.order_id} className="hover:bg-gray-50">
                  <Td>
                    <Link href={`/admin/r/payments/${order.order_id}`} className="text-sky-700 hover:underline">
                      {order.name || order.order_id.slice(0, 8)}
                    </Link>
                  </Td>
                  <Td>{order.product_type === 'logo' ? 'логотип' : 'брендбук'}</Td>
                  <Td right>{fmtMoney(order.amount)}</Td>
                  <Td>{orderBadge(order.status, order.delivery_status)}</Td>
                  <Td className="whitespace-nowrap text-gray-600">{fmtDate(order.created_at)}</Td>
                </tr>
              ))}
              {data.recentOrders.length === 0 && (
                <tr>
                  <Td className="text-gray-400">Заказов пока нет</Td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card>

        <Card title="Последние действия админов" action={<Link href="/admin/r/admin-actions" className="text-xs text-sky-700 hover:underline">журнал →</Link>} padded={false}>
          <Table>
            <thead>
              <tr>
                <Th>Когда</Th>
                <Th>Кто</Th>
                <Th>Действие</Th>
                <Th>Запись</Th>
              </tr>
            </thead>
            <tbody>
              {data.recentActions.map((action, i) => (
                <tr key={i}>
                  <Td className="whitespace-nowrap text-gray-600">{fmtDate(action.created_at)}</Td>
                  <Td>{action.admin_email}</Td>
                  <Td>
                    <Badge tone={action.action.endsWith(':failed') ? 'fail' : 'muted'}>{action.action}</Badge>
                  </Td>
                  <Td>
                    {action.target_id ? (
                      <Link href={`/admin/r/${action.target_type}/${action.target_id}`} className="text-sky-700 hover:underline">
                        {action.target_type}
                      </Link>
                    ) : (
                      action.target_type
                    )}
                  </Td>
                </tr>
              ))}
              {data.recentActions.length === 0 && (
                <tr>
                  <Td className="text-gray-400">Действий пока не было</Td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
