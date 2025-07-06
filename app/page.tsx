/* Главная страница приложения Pixora
 * 
 * Этот файл содержит компонент главной страницы, который отображает:
 * - Навигационную панель (Navbar)
 * - Hero секцию с основной информацией о сервисе
 * - Секцию с возможностями сервиса (Features)
 * - Отзывы клиентов (Testimonials)
 * - Генератор названий для бизнеса (NameGenerator)
 * - Footer с ссылками на другие страницы
 * 
 * Главная страница является точкой входа для пользователей и представляет
 * основную ценность сервиса, а также предоставляет доступ к генератору названий. */

import React from 'react';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Hero from './components/home/Hero';
import Features from './components/home/Features';
import Testimonials from './components/home/Testimonials';
import NameGenerator from './components/home/NameGenerator';

// Компонент главной страницы
export default function Home() {
  return (
    <>
      {/* Навигационная панель (фиксированная) */}
      <Navbar />
      
      {/* Основное содержимое страницы с отступом для навигационной панели */}
      <main className="pt-16"> 
        {/* Hero секция с основной информацией о сервисе */}
        <Hero />
        
        {/* Секция с возможностями сервиса */}
        <Features />
        
        {/* Отзывы клиентов */}
        <Testimonials />
        
        {/* Генератор названий для бизнеса */}
        <NameGenerator />
      </main>
      
      {/* Footer с ссылками на другие страницы */}
      <Footer />
    </>
  );
} 