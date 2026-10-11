import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Личный кабинет',
  description: 'Управляйте своими логотипами и брендбуками в личном кабинете Pixora',
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 