import React from 'react';
import type { Metadata } from 'next';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Hero from './components/home/Hero';
import Features from './components/home/Features';
import HowItWorks from './components/home/HowItWorks';
import NameGenerator from './components/home/NameGenerator';

// Без своего canonical главная склеилась бы с адресами вида /?utm_source=...
export const metadata: Metadata = {
  alternates: { canonical: '/' },
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
