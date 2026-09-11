import { escapeXml } from '../layout/svg';
import { MockupContext } from './canvas';

// Подпись письма — HTML с табличной вёрсткой, а не SVG: её вставляют в
// почтовый клиент, а SVG почтовые клиенты не показывают вовсе.
// Флексов и гридов здесь тоже быть не может — Outlook их не понимает.
export const emailSignature = (ctx: MockupContext, logoDataUri: string): string => {
  const { ink } = ctx;
  const safe = (value: string) => escapeXml(value);

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Подпись письма — ${safe(ctx.name)}</title>
</head>
<body style="margin:0;padding:24px;background:#ffffff;">

<!-- Скопируйте таблицу ниже и вставьте в настройки подписи почтового клиента.
     Картинка вшита в файл: если клиент её не покажет, загрузите logo.png
     из этой же папки на свой сайт и подставьте адрес в src.
     Контакты — заглушки, замените на свои. -->

<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <tr>
    <td style="padding-right:18px;border-right:3px solid ${ink.accent};vertical-align:middle;">
      <img src="${logoDataUri}" alt="${safe(ctx.name)}" width="150" style="display:block;border:0;outline:none;">
    </td>
    <td style="padding-left:18px;vertical-align:middle;">
      <div style="font-size:16px;font-weight:bold;line-height:22px;">Имя Фамилия</div>
      <div style="font-size:13px;color:#6b7280;line-height:20px;">Должность · ${safe(ctx.name)}</div>
      <div style="height:8px;line-height:8px;">&nbsp;</div>
      <div style="font-size:13px;line-height:20px;">
        <a href="tel:+79000000000" style="color:${ink.primary};text-decoration:none;">+7 900 000-00-00</a>
        &nbsp;·&nbsp;
        <a href="mailto:hello@example.ru" style="color:${ink.primary};text-decoration:none;">hello@example.ru</a>
      </div>
      <div style="font-size:13px;line-height:20px;">
        <a href="https://example.ru" style="color:${ink.primary};text-decoration:none;">example.ru</a>
      </div>
      ${
        ctx.slogan
          ? `<div style="height:8px;line-height:8px;">&nbsp;</div>
      <div style="font-size:12px;color:#9ca3af;line-height:18px;">${safe(ctx.slogan)}</div>`
          : ''
      }
    </td>
  </tr>
</table>

</body>
</html>
`;
};
