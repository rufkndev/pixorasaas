"use client";

import { ReactNode, useEffect } from 'react';

// Разделы в порядке полос PDF. Предпросмотр и страница брендбука строятся по
// одному списку: предпросмотр обязан выглядеть урезанной копией покупки
export const BRANDBOOK_SECTIONS = [
  { id: 'brand', title: 'О бренде' },
  { id: 'logo', title: 'Логотип' },
  { id: 'colors', title: 'Цвет' },
  { id: 'typography', title: 'Типографика' },
  { id: 'graphics', title: 'Иконки и графика' },
  { id: 'mockups', title: 'Носители' },
] as const;

export type SectionId = (typeof BRANDBOOK_SECTIONS)[number]['id'];

export const sectionNumber = (id: SectionId): string =>
  String(BRANDBOOK_SECTIONS.findIndex((section) => section.id === id) + 1).padStart(2, '0');

export const sectionTitle = (id: SectionId): string =>
  BRANDBOOK_SECTIONS.find((section) => section.id === id)?.title || '';

// Шрифты грузятся с нашего домена, а не с fonts.googleapis.com: помимо
// доступности без VPN это убирает передачу IP посетителя в Google
export function useBrandFonts(fonts: Array<{ cssUrl?: string }> | undefined) {
  // Зависимость — строка адресов, а не массив: страница брендбука перезапрашивает
  // заказ во время сборки, и новый массив каждый раз перевешивал бы ссылки
  const key = (fonts || []).map((font) => font.cssUrl).filter(Boolean).join('|');

  useEffect(() => {
    if (!key) return;

    const links = key.split('|').map((url) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      document.head.appendChild(link);
      return link;
    });

    return () => links.forEach((link) => link.remove());
  }, [key]);
}

export function BrandSection({
  id,
  aside,
  children,
}: {
  id: SectionId;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <div className="flex items-baseline justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          <span className="text-gray-400 font-medium mr-3">{sectionNumber(id)}</span>
          {sectionTitle(id)}
        </h2>
        {aside}
      </div>
      <div className="space-y-8">{children}</div>
    </section>
  );
}

// Что ещё есть в разделе за пределами страницы: в предпросмотре — что откроется
// после оплаты, в готовом брендбуке — что лежит в PDF
export function MoreInFile({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
      <p className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {title}
      </p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="text-gray-400">—</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RuleList({ title, items }: { title: string; items?: string[] }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex gap-3 text-gray-700">
            <span className="text-gray-400">—</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LogoVariantGrid({ variants }: { variants: any[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {variants.map((variant, index) => (
        <div key={variant.kind || index} className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Выворотку показываем на тёмном: на белом её просто не видно */}
          <div className={`p-6 h-48 flex items-center justify-center ${variant.onDark ? 'bg-gray-900' : 'bg-white'}`}>
            <img src={variant.url} alt={variant.name} className="max-h-full max-w-full object-contain" />
          </div>
          <div className="p-4 border-t border-gray-200">
            <h4 className="font-semibold text-gray-900">{variant.name}</h4>
            {variant.description && <p className="text-sm text-gray-600 mt-1">{variant.description}</p>}
            {variant.usage && <p className="text-xs text-gray-500 mt-2">{variant.usage}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// detailed — для купленного брендбука: RGB, CMYK и контраст. У брендбуков,
// собранных до нового сервиса палитры, этих полей нет, поэтому всё опционально
export function PaletteGrid({ colors, detailed = false }: { colors: any[]; detailed?: boolean }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {colors.map((color, index) => (
        <div key={color.key || index} className="border border-gray-200 rounded-lg overflow-hidden">
          <div
            className="h-24 flex items-end p-3"
            style={{ backgroundColor: color.hex, color: color.textOn?.hex }}
          >
            {color.textOn && <span className="text-sm font-semibold">Аа</span>}
          </div>
          <div className="p-3 space-y-1">
            <p className="font-semibold text-gray-900">{color.name}</p>
            <p className="text-sm text-gray-700 font-mono uppercase">{color.hex}</p>
            {detailed && (
              <>
                {color.rgb && <p className="text-xs text-gray-500 font-mono">{color.rgb}</p>}
                {color.cmyk && <p className="text-xs text-gray-500 font-mono">{color.cmyk}</p>}
                {color.textOn && (
                  <p className="text-xs text-gray-500">
                    Текст на цвете: {color.textOn.ratio.toFixed(1)}:1 {color.textOn.aa ? '· AA' : ''}
                  </p>
                )}
              </>
            )}
            {color.usage && <p className="text-xs text-gray-500 pt-1">{color.usage}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function FontSpecimens({
  fonts,
  businessName,
  slogan,
  detailed = false,
}: {
  fonts: any[];
  businessName: string;
  slogan?: string;
  detailed?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {fonts.map((font, index) => (
        <div key={font.family || index} className="border border-gray-200 rounded-lg p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">
                {font.role === 'heading' ? 'Заголовки' : 'Основной текст'}
              </p>
              <h3 className="text-xl font-bold text-gray-900">{font.family}</h3>
            </div>
            {/* Совпадение со шрифтом логотипа стоит показать прямо:
                это главный признак связности брендбука */}
            {font.matchesLogo && (
              <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 whitespace-nowrap">
                Как в логотипе
              </span>
            )}
          </div>

          <div className="space-y-2" style={{ fontFamily: `'${font.family}', sans-serif` }}>
            {font.role === 'heading' ? (
              <>
                <p className="text-3xl leading-tight" style={{ fontWeight: 700 }}>{businessName}</p>
                {slogan && <p className="text-xl" style={{ fontWeight: 500 }}>{slogan}</p>}
              </>
            ) : (
              <p className="text-base text-gray-800 leading-relaxed">
                Съешь же ещё этих мягких французских булок, да выпей чаю. 0123456789
              </p>
            )}
            <p className="text-lg text-gray-600">АБВГДЕЁЖЗ абвгдеёжз</p>
          </div>

          {detailed && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-1 text-sm text-gray-600">
              {font.usage && <p>{font.usage}</p>}
              {Array.isArray(font.weights) && <p>Начертания: {font.weights.join(', ')}</p>}
              {font.licence && <p>Лицензия {font.licence} — можно в коммерческих проектах</p>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function IconGrid({ icons }: { icons: any[] }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4">
      {icons.map((icon, index) => (
        <div key={icon.id || index} className="text-center">
          <div className="aspect-square bg-gray-50 rounded-lg flex items-center justify-center p-5">
            {/* Иконки — SVG из локальных наборов на сервере, не пользовательский ввод */}
            <div
              className="w-full h-full text-gray-900 [&_svg]:w-full [&_svg]:h-full"
              dangerouslySetInnerHTML={{ __html: icon.svg }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-2 truncate">{icon.name}</p>
        </div>
      ))}
    </div>
  );
}

const PATTERN_BOX: Record<string, string> = {
  pattern: 'aspect-square',
  divider: 'aspect-[20/1]',
  background: 'aspect-video',
};

export function PatternGrid({ patterns }: { patterns: any[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {patterns.map((pattern, index) => (
        <div key={pattern.id || index}>
          <div
            className={`${PATTERN_BOX[pattern.category] || 'aspect-square'} rounded-lg overflow-hidden border border-gray-200 [&_svg]:w-full [&_svg]:h-full`}
            dangerouslySetInnerHTML={{ __html: pattern.svg }}
          />
          <p className="text-sm font-medium text-gray-900 mt-2">{pattern.name}</p>
          {pattern.usage && <p className="text-xs text-gray-500">{pattern.usage}</p>}
        </div>
      ))}
    </div>
  );
}
