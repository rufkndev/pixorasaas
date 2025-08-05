import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Контакты Pixora - Связаться с нами по вопросам брендинга',
  description: 'Связаться с командой Pixora по вопросам создания логотипов и брендбуков. Техническая поддержка, консультации по брендингу, сотрудничество.',
  keywords: [
    'контакты pixora',
    'техническая поддержка',
    'связаться с pixora',
    'консультация по брендингу',
    'поддержка клиентов',
    'вопросы по логотипам',
    'сотрудничество pixora',
    'обратная связь'
  ],
  openGraph: {
    title: 'Контакты Pixora - Связаться с нами по вопросам брендинга',
    description: 'Связаться с командой Pixora по вопросам создания логотипов и брендбуков.',
    url: 'https://pixora-labs.ru/pages/contact',
    images: [
      {
        url: 'https://pixora-labs.ru/logo.svg',
        width: 1200,
        height: 630,
        alt: 'Контакты Pixora',
      },
    ],
  },
  twitter: {
    title: 'Контакты Pixora - Связаться с нами по вопросам брендинга',
    description: 'Связаться с командой Pixora по вопросам создания логотипов и брендбуков.',
  },
  alternates: {
    canonical: 'https://pixora-labs.ru/pages/contact',
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}