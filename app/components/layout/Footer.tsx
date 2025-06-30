// Компонент подвала сайта (Footer)
// - Ссылки, сгруппированные по категориям (О компании, Поддержка, Правовая информация)
// - Информацию об авторских правах с автоматически обновляемым годом

"use client";

import React from 'react';
import Link from 'next/link';

// Компонент подвала сайта
export default function Footer() {
  // Получение текущего года для информации об авторских правах
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Сетка с ссылками, сгруппированными по категориям */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Категория: О компании */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">О компании</h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link href="/pages/about" className="text-base text-gray-400 hover:text-white">
                  О нас
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Категория: Поддержка */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">Поддержка</h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link href="/pages/contact" className="text-base text-gray-400 hover:text-white">
                  Связаться с нами
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Категория: Правовая информация */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">Правовая информация</h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link href="/pages/privacy" className="text-base text-gray-400 hover:text-white">
                  Политика конфиденциальности
                </Link>
              </li>
              <li>
                <Link href="/pages/terms" className="text-base text-gray-400 hover:text-white">
                  Условия использования
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Информация об авторских правах */}
        <div className="mt-12 border-t border-gray-800 pt-8">
          <p className="text-base text-gray-400 text-center">
            &copy; {currentYear} Pixora. Все права защищены.
          </p>
        </div>
      </div>
    </footer>
  );
} 