import React from 'react';
import type { Metadata } from 'next';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Hero from './components/home/Hero';
import Features from './components/home/Features';
import HowItWorks from './components/home/HowItWorks';
import NameGenerator from './components/home/NameGenerator';
import { FREE_GENERATIONS, PRICES } from './lib/legal';
import { pageMetadata } from './lib/site';

// Без своего canonical главная склеилась бы с адресами вида /?utm_source=...
// absolute — чтобы шаблон «%s | Pixora» не дописал название сервиса второй раз
export const metadata: Metadata = {
  ...pageMetadata({
    title: 'Pixora — генератор названий, логотипов и брендбуков с ИИ',
    description:
      `Название, логотип и брендбук для бизнеса с помощью ИИ. ${FREE_GENERATIONS} бесплатных генераций, ` +
      `логотип в SVG и PNG — ${PRICES.logo} ₽, брендбук в PDF — ${PRICES.brandbook} ₽.`,
    path: '/',
  }),
  title: { absolute: 'Pixora — генератор названий, логотипов и брендбуков с ИИ' },
};

export default function Home() {
  return (
    <>
      <Navbar />

      <main className="pt-16">
        <Hero />

        <Features />

        <HowItWorks />

        <NameGenerator />
      </main>

      <Footer />
    </>
  );
}
