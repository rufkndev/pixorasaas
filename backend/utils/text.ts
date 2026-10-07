// Чистка до валидации. Текст уходит в промпты, PDF, имена файлов и темы писем,
// и невидимые символы опасны везде: RTLO меняет вид имени файла, zero-width
// прячет слово от проверок, управляющие символы ломают заголовки.

// Форматные (zero-width, bidi, BOM), частного использования, неназначенные и
// хангыльские заполнители, которые выглядят как пустота. Удаляются без следа:
// zero-width внутри слова не должен превращаться в пробел.
const INVISIBLE = /[\p{Cf}\p{Co}\p{Cn}\u115F\u1160\u3164\uFFA0]/gu;

// Управляющие (Cc) заменяются пробелом: табуляция и перевод строки разделяют слова
const CONTROL = /\p{Cc}/gu;
const CONTROL_KEEP_NEWLINE = /(?!\n)\p{Cc}/gu;

export const cleanText = (value: string, options: { multiline?: boolean } = {}): string => {
  // NFKC сводит полноширинные буквы, лигатуры и надстрочные цифры к обычным:
  // иначе «ｐｉｘｏｒａ» прошла бы мимо любой проверки на запрещённые слова
  let text = String(value ?? '').normalize('NFKC').replace(INVISIBLE, '');

  if (!options.multiline) {
    return text.replace(CONTROL, ' ').replace(/\s+/g, ' ').trim();
  }

  text = text.replace(/\r\n?|[\u2028\u2029]/g, '\n').replace(CONTROL_KEEP_NEWLINE, ' ');

  return text
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

// Название набирается нашими шрифтами, эмодзи в них нет — на логотипе вышли бы
// квадраты. Кавычки снимаются: «Ромашку» пишут по привычке, а обрамление в
// текстах брендбука мы ставим сами.
export const cleanBrandName = (value: string): string =>
  cleanText(value)
    .replace(/[‐‑‒–—―]/g, '-')
    .replace(/[’‘`´]/g, "'")
    .replace(/["«»„“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const BRAND_NAME = /^[\p{Script=Cyrillic}\p{Script=Latin}0-9 \-&.'+!]+$/u;
const HAS_LETTER_OR_DIGIT = /[\p{L}0-9]/u;

export const isBrandName = (value: string): boolean =>
  BRAND_NAME.test(value) && HAS_LETTER_OR_DIGIT.test(value);

// Поля, которые уходят в промпт: разметка и ссылки там не нужны ни для какой
// честной цели, а для попытки переписать инструкции модели — очень
const PROMPT_FORBIDDEN = /[<>{}`\\]|https?:\/\/|www\./i;

export const isPromptSafe = (value: string): boolean => !PROMPT_FORBIDDEN.test(value);
