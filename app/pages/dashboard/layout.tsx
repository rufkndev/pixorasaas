import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Личный кабинет | Pixora',
  description: 'Управляйте своими логотипами и брендбуками в личном кабинете Pixora',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 