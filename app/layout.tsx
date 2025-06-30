/* Корневой макет приложения (Root Layout)
 * 
 * Этот файл определяет:
 * - Общую структуру HTML для всех страниц
 * - Метаданные приложения (title, description)
 * - Подключение глобальных стилей
 * - Подключение шрифтов (Inter)
 * - Подключение AuthProvider для управления аутентификацией */

import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from './context/AuthContext';

const inter = Inter({ 
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Pixora - AI генератор названий, логотипов и брендбуков',
  description: 'Создайте уникальный бренд для вашего бизнеса с помощью искусственного интеллекта. Генерация названий, логотипов и брендбуков.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
} 