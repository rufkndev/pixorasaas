export type Script = 'cyrillic' | 'latin';

export interface NamePattern {
  id: string;
  label: string;
  instruction: string;
  length: [number, number];
  // Эталоны нужны отдельно по письменности: пример «Sokolov & Partners» уводит
  // модель от транслита русского слова надёжнее любой словесной инструкции
  hints: Record<Script, string[]>;
}

export const NAME_PATTERNS: Record<string, NamePattern> = {
  neologism: {
    id: 'neologism',
    label: 'неологизм',
    instruction: 'слитный неологизм из двух смысловых корней; звучит выдуманным, но читается с первого раза',
    length: [6, 11],
    hints: { cyrillic: ['Веркана', 'Тримея'], latin: ['Nordwell', 'Valtera'] },
  },
  classicRoot: {
    id: 'classicRoot',
    label: 'классический корень',
    instruction: 'слово от латинского или греческого корня, слегка адаптированное под произношение',
    length: [5, 10],
    hints: { cyrillic: ['Аквилон', 'Лумен'], latin: ['Lumina', 'Ferrum'] },
  },
  metaphor: {
    id: 'metaphor',
    label: 'метафора-образ',
    instruction: 'образ из природы, мифологии, геометрии или ремесла; сама ниша в слове не названа',
    length: [4, 9],
    hints: { cyrillic: ['Компас', 'Ясень'], latin: ['Anchor', 'Cedar'] },
  },
  twoWords: {
    id: 'twoWords',
    label: 'два слова',
    instruction: 'два отдельных слова через пробел: прилагательное с существительным или два существительных',
    length: [10, 20],
    hints: { cyrillic: ['Северный Ветер', 'Тихая Гавань'], latin: ['Bright Harbor', 'Iron Field'] },
  },
  surname: {
    id: 'surname',
    label: 'фамильное название',
    instruction: 'фамильное или именное название: «Дом X», «X и партнёры», «Братья X»',
    length: [8, 22],
    hints: { cyrillic: ['Ромашкин и партнёры', 'Дом Соколова'], latin: ['Sokolov & Partners', 'Bergman House'] },
  },
  abbreviation: {
    id: 'abbreviation',
    label: 'аббревиатура',
    instruction: 'аббревиатура из первых букв или слогов, 2-4 буквы, при необходимости со вторым словом',
    length: [3, 12],
    hints: { cyrillic: ['РТК Групп', 'АСМ'], latin: ['ARK Systems', 'NVL'] },
  },
  businessDescriptive: {
    id: 'businessDescriptive',
    label: 'деловое составное',
    instruction: 'деловое составное название, прямо называющее отрасль, — такое вносят в устав',
    length: [8, 18],
    hints: { cyrillic: ['ТрансЛогистик', 'Аквилон Капитал'], latin: ['MetalPrime', 'CargoLine'] },
  },
  shortAbstract: {
    id: 'shortAbstract',
    label: 'короткое абстрактное',
    instruction: 'короткое абстрактное слово 4-6 букв, открытое по смыслу, легко произносится',
    length: [4, 6],
    hints: { cyrillic: ['Орто', 'Веда'], latin: ['Zeva', 'Orbi'] },
  },
  phrase: {
    id: 'phrase',
    label: 'говорящая фраза',
    instruction: 'короткая говорящая фраза или глагольное сочетание, как реплика в разговоре',
    length: [8, 18],
    hints: { cyrillic: ['Держи Курс', 'Просто Хлеб'], latin: ['Keep It Warm', 'Go Further'] },
  },
  geo: {
    id: 'geo',
    label: 'географическое',
    instruction: 'привязка к месту или ремесленной традиции',
    length: [10, 22],
    hints: { cyrillic: ['Невская Мануфактура', 'Балтийский Двор'], latin: ['Baltic Yard', 'Nordvik Works'] },
  },
  wordplay: {
    id: 'wordplay',
    label: 'игра слов',
    instruction: 'игра слов на стыке ниши и ключевого слова, без цифр и дефисов',
    length: [5, 14],
    hints: { cyrillic: ['Чайкоф', 'Мукомол'], latin: ['Bakerloo', 'Brewtiful'] },
  },
};

// По одному вектору на корзину: без него повторное «Ещё варианты» уходит
// в модель почти тем же промптом и возвращает то же самое
export const CREATIVE_VECTORS = [
  'оттолкнись от материалов и фактур',
  'оттолкнись от движения и скорости',
  'оттолкнись от света и цвета',
  'оттолкнись от мифологии и легенд',
  'оттолкнись от геометрии и структуры',
  'оттолкнись от природы и стихий',
  'оттолкнись от ремесла и инструментов',
  'оттолкнись от навигации и сторон света',
  'оттолкнись от времени и ритма',
  'оттолкнись от звука и музыки',
];

export const SCRIPT_LABELS: Record<Script, string> = {
  cyrillic: 'кириллица',
  latin: 'латиница',
};
