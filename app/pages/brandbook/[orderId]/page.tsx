"use client";

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import React from 'react';

export default function BrandbookByOrderId() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading } = useAuth();

  const orderId = params.orderId as string;

  useEffect(() => {
    if (isLoading || !orderId) return;

    if (user) {
      // Перенаправляем на основную страницу брендбука.
      // userId в адресе больше не нужен — владельца определяет сервер по сессии.
      router.replace(`/pages/brandbook?orderId=${orderId}`);
    } else {
      router.replace(
        `/pages/login?next=${encodeURIComponent(`/pages/brandbook?orderId=${orderId}`)}`
      );
    }
  }, [user, isLoading, orderId, router]);

  // Показываем загрузку пока перенаправляем
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>
  );
}
