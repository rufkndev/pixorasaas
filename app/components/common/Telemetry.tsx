"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { reportClientError, trackVisit } from '../../lib/telemetry';

// Посещения и ошибки фронта. Админку не считаем: это не посетители
export default function Telemetry() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return;
    trackVisit(pathname);
  }, [pathname]);

  useEffect(() => {
    const onError = (event: ErrorEvent) => reportClientError(event.message, event.error?.stack);
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      reportClientError(reason?.message || String(reason), reason?.stack);
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
