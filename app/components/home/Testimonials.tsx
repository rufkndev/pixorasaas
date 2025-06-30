"use client";

import React from 'react';
import Image from 'next/image';

export default function Testimonials() {
  const testimonials = [
    {
      content: "Pixora помогла нам создать запоминающийся бренд за считанные минуты. Мы получили отличное название и логотип, которые идеально отражают нашу компанию.",
      author: {
        name: "Анна Смирнова",
        role: "CEO, TechStart",
        imageUrl: "/testimonials/person1.svg"
      }
    },
    {
      content: "Я был впечатлен качеством и скоростью работы сервиса. Брендбук, который мы получили, выглядит профессионально и помог нам сохранить единый стиль во всех материалах.",
      author: {
        name: "Иван Белоухов",
        role: "Маркетинг-директор, FoodDeli",
        imageUrl: "/testimonials/person2.svg"
      }
    },
    {
      content: "Сервис превзошел все мои ожидания. Мы перепробовали множество вариантов названий и логотипов, прежде чем найти идеальный. Pixora сэкономила нам время и деньги.",
      author: {
        name: "Мария Авделова",
        role: "Основатель, BeautyShop",
        imageUrl: "/testimonials/person3.svg"
      }
    },
  ];

  return (
    <section className="bg-white py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Что говорят наши клиенты
          </h2>
          <p className="mt-4 text-lg text-gray-700">
            Более 100 компаний уже воспользовались нашим сервисом для создания своего бренда
          </p>
        </div>
        
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index} 
              className="rounded-lg bg-gray-50 p-6 shadow-md border border-gray-200"
            >
              <div className="flex items-center">
                <div className="relative h-12 w-12 overflow-hidden rounded-full">
                  <Image
                    src={testimonial.author.imageUrl}
                    alt={testimonial.author.name}
                    width={48}
                    height={48}
                    className="object-cover"
                  />
                </div>
                <div className="ml-4">
                  <p className="font-medium text-gray-900">{testimonial.author.name}</p>
                  <p className="text-sm text-gray-700">{testimonial.author.role}</p>
                </div>
              </div>
              <p className="mt-4 text-gray-700 italic">"{testimonial.content}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 