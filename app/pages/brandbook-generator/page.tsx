"use client";

import { useEffect, Suspense, ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { trackEvent } from '../../lib/telemetry';
import Link from 'next/link';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { PRICES } from '../../lib/legal';
import { BrandSection, MoreInFile } from '../../components/brandbook/BrandbookBlocks';
import React from 'react';

const CONTENTS_TITLE = 'Что будет в разделе';

// Предпросмотр показывает только устройство брендбука, без настоящих цветов и
// версий логотипа. Списки сверены с полосами PDF и архивом: обещать здесь
// можно только то, что сборка действительно кладёт покупателю
const CONTENTS = {
  brand: ['Слоган', 'Суть бренда и аудитория', 'Характер — 3–5 качеств', 'Голос бренда и примеры текстов «так — да / так — нет»'],
  logo: ['7 версий: основная, горизонтальная, вертикальная, знак, чёрная, белая, в фирменном цвете', 'Охранное поле и минимальный размер', 'Недопустимое использование', 'SVG и PNG 2048 px без водяного знака'],
  colors: ['6 цветов, построенных от вашего логотипа', 'HEX, RGB и CMYK для печати', 'Контраст: какой текст читается на каждом цвете', 'Пропорции и правила применения'],
  typography: ['Пара шрифтов с кириллицей: как на логотипе и для текста', 'Размерная шкала и правила набора', 'Иерархия текста и примеры «так не надо»', 'Файлы TTF и WOFF2 с лицензией'],
  graphics: ['12 иконок в одном стиле под вашу нишу', 'Паттерны, разделители и подложки в фирменных цветах', 'SVG каждого элемента'],
  mockups: ['Визитка с вылетами в PDF — готова для типографии', 'Пост, сторис и обложка ВКонтакте', 'Слайд презентации', 'HTML-подпись для почты'],
};

const LOGO_SLOTS = [
  { name: 'Основная', dark: false },
  { name: 'Горизонтальная', dark: false },
  { name: 'Вертикальная', dark: false },
  { name: 'Только знак', dark: false },
  { name: 'Чёрная', dark: false },
  { name: 'Белая', dark: true },
  { name: 'В фирменном цвете', dark: false },
];

const COLOR_SLOTS = ['Основной', 'Дополнительный', 'Акцентный', 'Тёмный', 'Светлый', 'Нейтральный'];

// Пропорции заглушек — как у настоящих макетов, размеры из mockups/*
const MOCKUP_SLOTS = [
  { name: 'Визитка', size: '90 × 50 мм', box: 'aspect-[9/5]' },
  { name: 'Пост', size: '1080 × 1080 px', box: 'aspect-square' },
  { name: 'Сторис', size: '1080 × 1920 px', box: 'aspect-[9/16] w-1/2' },
  { name: 'Обложка ВКонтакте', size: '1920 × 768 px', box: 'aspect-[5/2]' },
  { name: 'Слайд презентации', size: '1920 × 1080 px', box: 'aspect-video' },
  { name: 'Подпись письма', size: 'HTML', box: 'aspect-[5/2]' },
];

// Статичная заглушка, без пульсации: здесь ничего не грузится, и мигание
// читалось бы как бесконечная загрузка
function Slot({ className = '', dark = false, children }: { className?: string; dark?: boolean; children?: ReactNode }) {
  return (
    <div
      className={`rounded-lg border border-dashed flex items-center justify-center text-sm ${
        dark ? 'bg-gray-800 border-gray-600 text-gray-400' : 'bg-gray-100 border-gray-300 text-gray-400'
      } ${className}`}
    >
      {children}
    </div>
  );
}

const Bar = ({ className }: { className: string }) => <div className={`bg-gray-200 rounded ${className}`} />;

function BrandbookPreviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  useRequireAuth();

  const name = searchParams.get('name') || '';
  const keywords = searchParams.get('keywords') || '';
  const logoUrl = searchParams.get('logoUrl') || '';
  const logoId = searchParams.get('logoId') || '';
  const industry = searchParams.get('industry') || '';
  const style = searchParams.get('style') || '';

  useEffect(() => {
    if (!name || !logoId) router.push('/');
  }, [name, logoId, router]);

  // Шаг воронки между логотипом и оплатой брендбука
  useEffect(() => {
    if (logoId) trackEvent('brandbook_preview_view', { logoId });
  }, [logoId]);

  const paymentHref = {
    pathname: '/pages/payment',
    query: { product: 'brandbook', name, keywords, logoUrl, logoId, industry, brandStyle: style },
  };

  const BuyButton = ({ light = false }: { light?: boolean }) => (
    <Link
      href={paymentHref}
      className={`inline-block py-3 px-6 rounded-md font-semibold text-center ${
        light ? 'bg-white text-gray-900 hover:bg-gray-100' : 'bg-gray-900 text-white hover:bg-gray-800'
      }`}
    >
      Получить полный брендбук — {PRICES.brandbook} ₽
    </Link>
  );

  return (
    <>
      <Navbar />
      <main className="pt-16 bg-gray-50">
        <section className="bg-gradient-to-r from-gray-900 to-gray-700 text-white py-12">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-sm uppercase tracking-widest text-gray-400 mb-6">Предпросмотр брендбука</p>
            <div className="w-36 h-36 mx-auto bg-white rounded-xl p-3 flex items-center justify-center mb-6">
              {logoUrl && <img src={logoUrl} alt={`Логотип ${name}`} className="max-h-full max-w-full object-contain" />}
            </div>
            <h1 className="text-4xl font-bold mb-3">{name}</h1>
            <p className="text-gray-400 text-sm mt-4 max-w-2xl mx-auto">
              Так устроен ваш будущий брендбук: те же разделы, что в PDF. Вместо содержимого здесь
              заглушки — цвета, шрифты и версии логотипа соберём под ваш логотип после оплаты.
            </p>
            <div className="mt-6">
              <BuyButton light />
            </div>
          </div>
        </section>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
          <BrandSection id="brand">
            <div className="space-y-3">
              <Bar className="h-6 w-2/3" />
              <Bar className="h-4 w-full" />
              <Bar className="h-4 w-5/6" />
              <div className="flex gap-2 pt-2">
                {[0, 1, 2, 3].map((index) => <Bar key={index} className="h-7 w-24 rounded-full" />)}
              </div>
            </div>
            <MoreInFile title={CONTENTS_TITLE} items={CONTENTS.brand} />
          </BrandSection>

          <BrandSection id="logo">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {LOGO_SLOTS.map((slot) => (
                <div key={slot.name}>
                  <Slot className="h-28" dark={slot.dark}>Логотип</Slot>
                  <p className="text-sm text-gray-700 mt-2">{slot.name}</p>
                </div>
              ))}
            </div>
            <MoreInFile title={CONTENTS_TITLE} items={CONTENTS.logo} />
          </BrandSection>

          <BrandSection id="colors">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {COLOR_SLOTS.map((slot) => (
                <div key={slot}>
                  <Slot className="h-20">HEX</Slot>
                  <p className="text-sm text-gray-700 mt-2">{slot}</p>
                </div>
              ))}
            </div>
            <MoreInFile title={CONTENTS_TITLE} items={CONTENTS.colors} />
          </BrandSection>

          <BrandSection id="typography">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {['Заголовки', 'Основной текст'].map((role) => (
                <div key={role} className="border border-gray-200 rounded-lg p-5">
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-3">{role}</p>
                  <p className="text-5xl font-bold text-gray-300 mb-4">Аа</p>
                  <div className="space-y-2">
                    <Bar className="h-4 w-full" />
                    <Bar className="h-4 w-4/5" />
                  </div>
                </div>
              ))}
            </div>
            <MoreInFile title={CONTENTS_TITLE} items={CONTENTS.typography} />
          </BrandSection>

          <BrandSection id="graphics">
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
              {Array.from({ length: 12 }, (_, index) => (
                <Slot key={index} className="aspect-square" />
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {['Паттерн', 'Разделитель', 'Подложка'].map((label) => (
                <Slot key={label} className="aspect-video">{label}</Slot>
              ))}
            </div>
            <MoreInFile title={CONTENTS_TITLE} items={CONTENTS.graphics} />
          </BrandSection>

          <BrandSection id="mockups">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 items-end">
              {MOCKUP_SLOTS.map((slot) => (
                <div key={slot.name}>
                  <Slot className={`${slot.box} mx-auto`}>{slot.size}</Slot>
                  <p className="text-sm text-gray-700 mt-2">{slot.name}</p>
                </div>
              ))}
            </div>
            <MoreInFile title={CONTENTS_TITLE} items={CONTENTS.mockups} />
          </BrandSection>

          <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200 text-center space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Заберите брендбук целиком</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Все исходники и брендбук в PDF-формате в одном архиве. Соберём за несколько минут после
              оплаты и пришлём ссылку на почту.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <BuyButton />
              <Link
                href={{ pathname: '/pages/logo-generator', query: { name, keywords, industry, style } }}
                className="py-3 px-6 border border-gray-300 rounded-md font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Вернуться к логотипу
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function BrandbookGeneratorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900" />
      </div>
    }>
      <BrandbookPreviewContent />
    </Suspense>
  );
}
