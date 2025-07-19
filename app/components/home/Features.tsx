"use client";

import React from 'react';

export default function Features() {
  const features = [
    {
      name: 'Генерация названий',
      description: 'Создавайте уникальные и запоминающиеся названия для вашего бизнеса с помощью искусственного интеллекта.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      ),
    },
    {
      name: 'Дизайн логотипов',
      description: 'Получите профессиональный логотип, который отражает сущность вашего бренда и выделяется среди конкурентов.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      name: 'Создание брендбука',
      description: 'Разработайте брендбук с вашим уникальным брендингом: фирменные цвета, шрифты, элементы дизайна, брендированные макеты и материалы и руководство по использованию.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
  ];

  return (
    <div className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:text-center">
          <h2 className="text-base text-gray-700 font-semibold tracking-wide uppercase">Возможности</h2>
          <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Все, что нужно для создания бренда
          </p>
          <p className="mt-4 max-w-2xl text-xl text-gray-700 lg:mx-auto">
            Pixora предлагает комплексное решение для создания и развития вашего бренда с использованием передовых технологий искусственного интеллекта.
          </p>
        </div>

        <div className="mt-10">
          <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-3 md:gap-x-8 md:gap-y-10">
            {features.map((feature) => (
              <div key={feature.name} className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-gray-900 text-white">
                    {feature.icon}
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">{feature.name}</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-700">{feature.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
} 