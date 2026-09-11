import { escapeHtml } from '../utils/html';
import { getAppUrl, renderLayout } from './layout';

// Сборка идёт минутами, и покупатель обычно уходит со страницы успеха.
// Письмо — единственный способ вернуть его к готовому заказу.
export const brandbookReadyTemplate = (input: { businessName: string; orderId: string }) => {
  const url = `${getAppUrl()}/pages/brandbook?orderId=${encodeURIComponent(input.orderId)}`;
  const name = escapeHtml(input.businessName);

  const html = renderLayout({
    title: 'Брендбук готов',
    body: `
      Здравствуйте!<br><br>
      Брендбук «${name}» собран и ждёт вас в личном кабинете.
      Внутри — PDF с правилами, логотип во всех версиях, шрифты с лицензией,
      иконки и макеты носителей. Всё это скачивается одним архивом.
    `,
    action: { label: 'Открыть брендбук', url },
    footerNote:
      'Файлы хранятся в кабинете, скачать их можно в любой момент. ' +
      'Контакты в макетах — заглушки, замените их на свои.',
  });

  const text = [
    'Здравствуйте!',
    '',
    `Брендбук «${input.businessName}» собран и ждёт вас в личном кабинете:`,
    url,
    '',
    'Внутри — PDF с правилами, логотип во всех версиях, шрифты с лицензией,',
    'иконки и макеты носителей. Всё скачивается одним архивом.',
    '',
    'Контакты в макетах — заглушки, замените их на свои.',
  ].join('\n');

  return {
    subject: `Брендбук «${input.businessName}» готов`,
    html,
    text,
  };
};
