import type { Metadata } from 'next';
import React from 'react';
import AdminShell from '../components/admin/AdminShell';

// Служебный раздел: не индексируется и в sitemap не попадает
export const metadata: Metadata = {
  title: 'Управление',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
