import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Подтверждение почты — Pixora',
  description: 'Подтверждение адреса электронной почты.',
  robots: { index: false, follow: false },
};

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
