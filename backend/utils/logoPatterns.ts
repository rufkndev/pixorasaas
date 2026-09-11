// Нужен ли знак от картинной модели и нужна ли набранная шрифтом надпись
export type LogoKind = 'mark' | 'type' | 'combo';

export interface LogoPattern {
  id: string;
  label: string;
  // Что должна придумать текстовая модель на шаге концепции
  instruction: string;
  // Каркас композиции для картинной модели, на английском
  promptShape: string;
  kind: LogoKind;
}

// Раньше приём был один на всё — «абстрактный геометрический знак», и любые
// название с нишей давали одну и ту же фигуру
export const LOGO_PATTERNS: Record<string, LogoPattern> = {
  object: {
    id: 'object',
    label: 'предметный знак',
    instruction:
      'один конкретный предмет из мира этой ниши, узнаваемый по силуэту; ' +
      'предмет называется существительным, а не описывается как «форма»',
    promptShape: 'a single recognizable object icon, solid flat shapes, clear silhouette',
    kind: 'mark',
  },
  lettermark: {
    id: 'lettermark',
    label: 'монограмма',
    instruction:
      'монограмма из одной-двух первых букв названия, построенная геометрически; ' +
      'буквы латинские, кириллицу картинная модель рисует с ошибками',
    promptShape: 'a single capital latin letter built from geometric strokes, monogram construction',
    kind: 'mark',
  },
  emblem: {
    id: 'emblem',
    label: 'эмблема',
    instruction: 'знак, вписанный в круг, щит или печать; внутри — один предмет, а не набор мелочей',
    promptShape: 'an emblem: one object enclosed in a circular or shield outline, flat two-color',
    kind: 'combo',
  },
  negativeSpace: {
    id: 'negativeSpace',
    label: 'негативное пространство',
    instruction: 'предмет, внутри которого просветом читается второй образ; оба образа из ниши',
    promptShape: 'a shape where the negative space forms a second recognizable object, two flat colors',
    kind: 'mark',
  },
  lineArt: {
    id: 'lineArt',
    label: 'контурный знак',
    instruction: 'предмет, нарисованный одной линией постоянной толщины, без заливок',
    promptShape: 'a continuous single-weight outline drawing, no fills, even stroke width',
    kind: 'mark',
  },
  mascot: {
    id: 'mascot',
    label: 'маскот',
    instruction: 'стилизованное животное или персонаж, связанный с нишей; голова или силуэт целиком',
    promptShape: 'a stylized animal or character head, flat vector, friendly geometric shapes',
    kind: 'mark',
  },
  geometric: {
    id: 'geometric',
    label: 'геометрический знак',
    instruction: 'абстрактный знак из простых пересекающихся форм, с внятной идеей за формой',
    promptShape: 'an abstract geometric mark from simple interlocking shapes',
    kind: 'mark',
  },
  badge: {
    id: 'badge',
    label: 'ремесленный штамп',
    instruction: 'знак в духе цехового клейма или штампа: плотная форма, ощущение оттиска',
    promptShape: 'a craft stamp mark, dense solid shape, vintage workshop seal feel',
    kind: 'combo',
  },
  wordmark: {
    id: 'wordmark',
    label: 'логотип-слово',
    instruction:
      'знака нет: работает только само название, набранное шрифтом; ' +
      'опиши характер начертания и палитру',
    promptShape: '',
    kind: 'type',
  },
  combination: {
    id: 'combination',
    label: 'знак и название',
    instruction: 'компактный предметный знак, который встанет над названием в единый блок',
    promptShape: 'a compact object icon designed to sit above a wordmark, flat vector',
    kind: 'combo',
  },
};

// По одному вектору на генерацию. Без него повторное нажатие уходит в модель
// почти тем же промптом и возвращает тот же знак
export const LOGO_VECTORS = [
  'оттолкнись от предмета, которым пользуются в этой профессии',
  'оттолкнись от того, что компания производит или продаёт',
  'оттолкнись от первой буквы названия',
  'оттолкнись от материала и фактуры',
  'оттолкнись от движения и жеста',
  'оттолкнись от места и природы вокруг',
  'оттолкнись от результата, который получает клиент',
  'оттолкнись от старинного цехового знака',
  'оттолкнись от структуры, сетки и повтора',
  'оттолкнись от света, тени и контраста',
];

export const getLogoPattern = (id: string): LogoPattern =>
  LOGO_PATTERNS[id] || LOGO_PATTERNS.object;

// Приём, ещё не использованный в этой сессии. Когда пул исчерпан — идём на второй круг,
// иначе после семи генераций выбирать было бы не из чего
export const pickPattern = (pool: string[], used: string[]): LogoPattern => {
  const fresh = pool.filter((id) => !used.includes(id));
  const source = fresh.length > 0 ? fresh : pool;
  return getLogoPattern(source[Math.floor(Math.random() * source.length)]);
};

export const pickVector = (): string =>
  LOGO_VECTORS[Math.floor(Math.random() * LOGO_VECTORS.length)];
