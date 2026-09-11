import React from 'react';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Hero from './components/home/Hero';
import Features from './components/home/Features';
import Testimonials from './components/home/Testimonials';
import NameGenerator from './components/home/NameGenerator';

export default function Home() {
  return (
    <>
      <Navbar />
      
      <main className="pt-16"> 
        <Hero />
        
        <Features />
        
        <Testimonials />
        
        <NameGenerator />
      </main>
      
      <Footer />
    </>
  );
} 