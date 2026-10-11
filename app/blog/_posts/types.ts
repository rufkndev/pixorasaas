import type { ReactNode } from 'react';
import type { FaqItem } from '../../components/landing/Faq';

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  // Даты в формате ГГГГ-ММ-ДД. updated поднимайте при каждой правке текста:
  // поисковики и ИИ-ассистенты охотнее берут свежие материалы
  published: string;
  updated: string;
  readingMinutes: number;
  // Ответ в трёх-четырёх пунктах в самом начале: его ассистенты и цитируют
  summary: string[];
  body: ReactNode;
  faq: FaqItem[];
}
