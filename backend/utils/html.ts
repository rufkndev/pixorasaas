const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

// Экранирование перед вставкой в HTML письма. Без него имя и текст из формы
// позволяют внедрить чужую разметку в письмо, уходящее на произвольный адрес.
export const escapeHtml = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, (char) => ESCAPES[char]);

// То же плюс перевод строк в <br>
export const escapeHtmlMultiline = (value: unknown): string =>
  escapeHtml(value).replace(/\r?\n/g, '<br>');
