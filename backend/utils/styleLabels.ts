export interface StyleProfile {
  tone: string;
  // Пул больше числа слотов: от генерации к генерации меняется не только
  // порядок приёмов, но и их состав
  patterns: string[];
  forbidden: string[];
  extraRule?: string;
  // Приёмы логотипа из LOGO_PATTERNS. До этого стиль влиял на логотип одной
  // строкой tone, и знак выходил одинаковым при любом выборе
  logoPatterns: string[];
  logoPalette: string;
}

// Раньше стиль влиял на одну строку промпта, а длина, приёмы и запреты были общими
// для всех пяти — выдачи получались неразличимыми
export const STYLE_PROFILES: Record<string, StyleProfile> = {
  modern: {
    tone: 'современный, лаконичный, технологичный',
    patterns: ['neologism', 'shortAbstract', 'classicRoot', 'metaphor', 'twoWords', 'wordplay', 'abbreviation'],
    forbidden: ['студия', 'сервис', 'мастер', 'плюс', 'про'],
    logoPatterns: ['object', 'lettermark', 'geometric', 'negativeSpace', 'lineArt', 'combination', 'wordmark'],
    logoPalette: 'один насыщенный цвет и один тёмный нейтральный, без градиентов',
  },
  classic: {
    tone: 'классический, строгий, вызывающий доверие',
    patterns: ['classicRoot', 'surname', 'geo', 'twoWords', 'metaphor', 'businessDescriptive', 'abbreviation'],
    forbidden: ['диджитал', 'лаб', 'нео', 'смарт', 'хаб'],
    logoPatterns: ['emblem', 'badge', 'lettermark', 'object', 'lineArt', 'combination', 'wordmark'],
    logoPalette: 'глубокий синий, бордовый или тёмно-зелёный плюс золотистый акцент',
  },
  creative: {
    tone: 'креативный, неожиданный, запоминающийся',
    patterns: ['metaphor', 'wordplay', 'phrase', 'neologism', 'twoWords', 'shortAbstract', 'geo'],
    forbidden: ['групп', 'холдинг', 'пром'],
    logoPatterns: ['negativeSpace', 'mascot', 'object', 'lineArt', 'geometric', 'badge', 'combination'],
    logoPalette: 'два контрастных цвета, допустим яркий неожиданный акцент',
  },
  professional: {
    tone: 'профессиональный, деловой, солидный',
    patterns: ['businessDescriptive', 'surname', 'abbreviation', 'classicRoot', 'twoWords', 'geo', 'neologism'],
    forbidden: [],
    extraRule:
      'название должно естественно звучать в связке ООО «…» и в реквизитах договора; ' +
      'слова «Групп», «Капитал», «Пром», «Транс», «Строй», «Инвест» здесь разрешены',
    logoPatterns: ['lettermark', 'object', 'geometric', 'emblem', 'combination', 'wordmark', 'lineArt'],
    logoPalette: 'сдержанная пара: синий или графитовый плюс один спокойный акцент',
  },
  playful: {
    tone: 'игривый, лёгкий, дружелюбный',
    patterns: ['phrase', 'wordplay', 'metaphor', 'shortAbstract', 'twoWords', 'neologism', 'surname'],
    forbidden: ['групп', 'холдинг', 'капитал', 'пром', 'инвест'],
    logoPatterns: ['mascot', 'object', 'negativeSpace', 'badge', 'combination', 'lineArt', 'wordmark'],
    logoPalette: 'тёплые живые цвета, два-три, без тёмного корпоративного синего',
  },
};

export const getStyleProfile = (style: string): StyleProfile =>
  STYLE_PROFILES[style] || STYLE_PROFILES.modern;

// В форме стиль хранится латиницей (modern, playful), но в промпт должен уходить
// русский текст — иначе модель получает английское слово посреди русской фразы
export const styleToRussian = (style: string): string => STYLE_PROFILES[style]?.tone || style;
