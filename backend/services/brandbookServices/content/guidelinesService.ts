import { z } from 'zod';

import { CLIENT_DATA_RULE, clamp, clientData, requestJson } from '../../../utils/llmJson';
import { quoted } from '../../../utils/slug';
import { getStyleProfile } from '../../../utils/styleLabels';
import { BrandColor } from '../brand/paletteService';
import { BrandFont } from '../brand/typographyService';

export interface BrandGuidelines {
  // Суть бренда: два-три предложения, с них начинается документ
  essence: string;
  personality: string[];
  audience: string;
  // Правила по разделам. Каждая строка — один пункт полосы PDF
  logoRules: string[];
  misuse: string[];
  colorRules: string[];
  typographyRules: string[];
  toneOfVoice: {
    summary: string;
    doList: string[];
    dontList: string[];
    examples: { correct: string; incorrect: string };
  };
}

// Границы полей — защита вёрстки, а не придирка: длинная строка выезжает
// за поля полосы. Схема ограничивает грубо, clamp дорезает точно.
const schema = z.object({
  essence: z.string().min(20).max(600),
  personality: z.array(z.string().min(2).max(60)).min(3).max(5),
  audience: z.string().min(10).max(300),
  logoRules: z.array(z.string().min(5).max(300)).min(3).max(6),
  misuse: z.array(z.string().min(5).max(300)).min(3).max(6),
  colorRules: z.array(z.string().min(5).max(300)).min(3).max(6),
  typographyRules: z.array(z.string().min(5).max(300)).min(3).max(6),
  toneOfVoice: z.object({
    summary: z.string().min(10).max(400),
    doList: z.array(z.string().min(5).max(200)).min(3).max(5),
    dontList: z.array(z.string().min(5).max(200)).min(3).max(5),
    examples: z.object({
      correct: z.string().min(5).max(300),
      incorrect: z.string().min(5).max(300),
    }),
  }),
});

const SYSTEM =
  'Ты бренд-стратег и автор брендбуков для российского малого бизнеса. ' +
  'Пишешь по-русски, конкретно, без маркетинговой воды. ' +
  'Отвечаешь только валидным JSON без markdown и пояснений. ' +
  CLIENT_DATA_RULE;

export interface GuidelinesInput {
  name: string;
  slogan: string;
  keywords: string;
  industry: string;
  style: string;
  colors: BrandColor[];
  fonts: BrandFont[];
}

const buildPrompt = (input: GuidelinesInput): string => {
  const profile = getStyleProfile(input.style);
  const heading = input.fonts.find((font) => font.role === 'heading');
  const body = input.fonts.find((font) => font.role === 'body');

  return [
    clientData([
      ['Бренд', quoted(input.name)],
      ['Слоган', input.slogan],
      ['Ниша', input.industry || input.keywords],
      ['Ключевые характеристики', input.keywords],
    ]),
    `Тон бренда: ${profile.tone}.`,
    '',
    'Уже подобрано, ссылайся на это конкретно:',
    `- палитра: ${input.colors.map((color) => `${color.name} ${color.hex}`).join(', ')};`,
    `- заголовочный шрифт: ${heading?.family || 'не задан'};`,
    `- текстовый шрифт: ${body?.family || 'не задан'}.`,
    '',
    'Напиши разделы брендбука. Требования к каждому:',
    '- essence: два-три предложения о сути бренда, без слов «качество» и «лидер»;',
    '- personality: 3-5 качеств характера бренда, по одному слову;',
    '- audience: кто клиент, одно-два предложения с конкретикой;',
    '- logoRules: 3-6 правил размещения логотипа именно этого бренда;',
    '- misuse: 3-6 запретов — что с логотипом делать нельзя;',
    '- colorRules: 3-6 правил про эту палитру, с упоминанием ролей цветов;',
    '- typographyRules: 3-6 правил про эту пару шрифтов;',
    '- toneOfVoice: как бренд разговаривает, что делать и чего избегать,',
    '  плюс по одной фразе-примеру: удачной и неудачной.',
    '',
    'Каждый пункт — одна законченная фраза не длиннее 200 символов.',
    'Ответ — только JSON вида {"essence":"","personality":[],"audience":"",',
    '"logoRules":[],"misuse":[],"colorRules":[],"typographyRules":[],',
    '"toneOfVoice":{"summary":"","doList":[],"dontList":[],"examples":{"correct":"","incorrect":""}}}.',
  ]
    .filter(Boolean)
    .join('\n');
};

const LIMIT = { line: 200, block: 400 };

// Тип берём из схемы, а не BrandGuidelines: при strict: false в проекте zod
// выводит все поля необязательными, хотя parse их наличие уже гарантировал
const trim = (guidelines: z.infer<typeof schema>): BrandGuidelines => ({
  essence: clamp(guidelines.essence, LIMIT.block),
  personality: guidelines.personality.map((item) => clamp(item, 40)),
  audience: clamp(guidelines.audience, LIMIT.block),
  logoRules: guidelines.logoRules.map((item) => clamp(item, LIMIT.line)),
  misuse: guidelines.misuse.map((item) => clamp(item, LIMIT.line)),
  colorRules: guidelines.colorRules.map((item) => clamp(item, LIMIT.line)),
  typographyRules: guidelines.typographyRules.map((item) => clamp(item, LIMIT.line)),
  toneOfVoice: {
    summary: clamp(guidelines.toneOfVoice.summary, LIMIT.block),
    doList: guidelines.toneOfVoice.doList.map((item) => clamp(item, LIMIT.line)),
    dontList: guidelines.toneOfVoice.dontList.map((item) => clamp(item, LIMIT.line)),
    examples: {
      correct: clamp(guidelines.toneOfVoice.examples.correct, LIMIT.line),
      incorrect: clamp(guidelines.toneOfVoice.examples.incorrect, LIMIT.line),
    },
  },
});

// Запасной вариант подставляет в шаблон реальные цвета и шрифты этого бренда.
// Он беднее ответа модели, но не врёт и не оставляет полосы пустыми.
export const fallbackGuidelines = (input: GuidelinesInput): BrandGuidelines => {
  const profile = getStyleProfile(input.style);
  const primary = input.colors.find((color) => color.key === 'primary');
  const accent = input.colors.find((color) => color.key === 'accent');
  const heading = input.fonts.find((font) => font.role === 'heading');
  const body = input.fonts.find((font) => font.role === 'body');

  return {
    essence: `${quoted(input.name)} — ${input.industry || input.keywords}. Характер подачи: ${profile.tone}.`,
    personality: profile.tone.split(',').map((word) => word.trim()).filter(Boolean).slice(0, 4),
    audience: `Клиенты, которым важна сфера «${input.industry || input.keywords}».`,
    logoRules: [
      // Формулировка совпадает с тем, что нарисовано на полосе охранного поля
      'Свободное поле вокруг логотипа — не меньше десятой части его большей стороны.',
      'Минимальный размер: 20 мм в печати и 80 px на экране.',
      'На тёмных подложках используйте выворотку, на светлых — основную версию.',
      'На фотографии логотип ставится только на однотонную подложку.',
    ],
    misuse: [
      'Не растягивайте и не сжимайте логотип — пропорции неизменны.',
      'Не поворачивайте логотип.',
      'Не добавляйте тени, обводки и градиенты.',
      'Не перекрашивайте логотип в цвета вне фирменной палитры.',
      'Не размещайте на пёстром фоне без подложки.',
    ],
    colorRules: [
      `Основной цвет ${primary?.hex || ''} — до половины площади макета.`,
      `Акцентный ${accent?.hex || ''} — не больше десятой части: он теряет силу от частого повторения.`,
      'Текст на цветной подложке берите того цвета, что указан в паре к ней.',
      'Нейтральный цвет — для рамок и неактивных элементов, не для текста.',
    ],
    typographyRules: [
      `${heading?.family || 'Заголовочный шрифт'} — заголовки, начертания 600–700.`,
      `${body?.family || 'Текстовый шрифт'} — основной текст, начертания 400–500.`,
      'Больше двух семейств в одном макете не используйте.',
      'Кегль основного текста — не меньше 14 px на экране и 9 pt в печати.',
    ],
    toneOfVoice: {
      summary: `Говорите так, как описывает характер бренда: ${profile.tone}.`,
      doList: [
        'Пишите короткими фразами и по делу.',
        'Называйте конкретную пользу для клиента.',
        'Обращайтесь к читателю напрямую.',
      ],
      dontList: [
        'Не используйте канцелярит и обороты вроде «осуществляем деятельность».',
        'Не обещайте того, что не можете подтвердить.',
        'Не злоупотребляйте восклицательными знаками.',
      ],
      examples: {
        correct: `${input.name} — ${input.slogan || 'коротко и по делу о том, что вы делаете'}.`,
        incorrect: 'Мы осуществляем комплексное предоставление услуг высочайшего качества!',
      },
    },
  };
};

export class GuidelinesService {
  // Никогда не бросает: рекомендации не повод рушить оплаченный заказ
  async generateGuidelines(input: GuidelinesInput): Promise<BrandGuidelines> {
    const parsed = await requestJson({
      label: 'рекомендации',
      system: SYSTEM,
      prompt: buildPrompt(input),
      maxTokens: 3000,
      schema,
    });

    return parsed ? trim(parsed) : fallbackGuidelines(input);
  }
}

export const guidelinesService = new GuidelinesService();
