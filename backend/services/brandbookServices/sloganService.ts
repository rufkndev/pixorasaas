import { getStyleProfile } from '../../utils/styleLabels';
import { clamp, requestText } from '../../utils/llmJson';

const SYSTEM =
  'Ты копирайтер, который пишет короткие слоганы для российских компаний. ' +
  'Отвечаешь строго в запрошенном формате, без пояснений.';

// Кавычки модель ставит охотно, причём и «ёлочки» тоже — прежняя чистка
// снимала только " и ', и слоган уходил покупателю в кавычках
const stripQuotes = (value: string): string =>
  value.replace(/^["'«„`]+/, '').replace(/["'»“`]+$/, '').trim();

const buildPrompt = (name: string, keywords: string, style: string): string => {
  const profile = getStyleProfile(style);

  return [
    `Придумай слоган для бренда «${name}».`,
    `Ниша и характер бизнеса: ${keywords}.`,
    `Тон: ${profile.tone}.`,
    '',
    'Требования:',
    '- от двух до шести слов, одна строка;',
    '- по-русски, без англицизмов и без транслита;',
    '- не повторяй название бренда внутри слогана;',
    '- никаких «качество», «лидер рынка», «с заботой о вас» и прочих штампов;',
    '- без кавычек, без точки в конце.',
    '',
    'В ответе — только сам слоган.',
  ].join('\n');
};

export class SloganService {
  // Возвращает пустую строку, если модель не ответила: слоган украшение, и
  // ронять из-за него оплаченный брендбук нельзя
  async generateSlogan(name: string, keywords: string, style: string): Promise<string> {
    const raw = await requestText({
      label: 'слоган',
      system: SYSTEM,
      prompt: buildPrompt(name, keywords, style),
      maxTokens: 600,
    });

    if (!raw) return '';

    // Модель иногда добавляет вступление — берём последнюю непустую строку
    const line = raw
      .split('\n')
      .map((part) => stripQuotes(part))
      .filter(Boolean)
      .pop();

    return line ? clamp(line, 120) : '';
  }
}

export const sloganService = new SloganService();
