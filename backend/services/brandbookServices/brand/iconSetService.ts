import { getIconData, iconToSVG, replaceIDs } from '@iconify/utils';

import { commonTerms, expand, termsFor } from '../../../utils/iconTerms';
import { log } from '../../../logger';

// Наборы лежат в node_modules, а не тянутся с api.iconify.design: тот за
// Cloudflare и без VPN отвечает через раз, а десятки последовательных запросов
// на заказ растягивали шаг иконок на минуту. Все четыре лицензии разрешают
// коммерческое использование — иначе набор в платный архив класть нельзя.
const SETS = {
  lucide: { title: 'Lucide', licence: 'ISC', url: 'https://lucide.dev' },
  tabler: { title: 'Tabler Icons', licence: 'MIT', url: 'https://tabler.io/icons' },
  ph: { title: 'Phosphor', licence: 'MIT', url: 'https://phosphoricons.com' },
  ri: { title: 'Remix Icon', licence: 'Apache-2.0', url: 'https://remixicon.com' },
} as const;

export type IconSetName = keyof typeof SETS;

export interface IconSetInfo {
  set: IconSetName;
  title: string;
  licence: string;
  url: string;
}

export interface BrandIcon {
  id: string;
  name: string;
  description: string;
  usage: string;
  svg: string;
  // Поле называется category, а не kind: так его читают и страница брендбука,
  // и роут скачивания, оставшиеся от прежнего сервиса
  category: 'icon';
  set: IconSetName;
  licence: string;
}

// Один набор на весь брендбук, а не «три предпочтительных»: смешивать наборы
// нельзя — разная оптика видна сразу, об этом прямо написано на полосе.
// Вариант начертания тоже фиксируется: у Phosphor шесть весов одной иконки.
interface StyleChoice {
  set: IconSetName;
  // Какие имена внутри набора берём: у ph это -bold/-fill, у ri -line/-fill
  suffix: string;
  // Имена с этими окончаниями отбрасываем
  exclude: string[];
}

const STYLE_SETS: Record<string, StyleChoice> = {
  modern: { set: 'lucide', suffix: '', exclude: [] },
  professional: { set: 'tabler', suffix: '', exclude: ['-filled'] },
  classic: { set: 'ri', suffix: '-line', exclude: [] },
  creative: { set: 'ph', suffix: '-bold', exclude: [] },
  playful: { set: 'ph', suffix: '-fill', exclude: ['-duotone'] },
};

// Состояния интерфейса и чужие логотипы в фирменном наборе не нужны:
// «scale-off» — перечёркнутые весы, «app-store-logo» — чужой бренд
const NEVER = ['-off', '-outline', '-filled', '-slash'];

const collections = new Map<IconSetName, any>();

const load = (set: IconSetName): any => {
  const cached = collections.get(set);
  if (cached) return cached;

  // require, а не import: наборы весят мегабайты, и грузить все четыре при
  // старте процесса незачем — нужен ровно один на заказ
  const collection = require(`@iconify-json/${set}/icons.json`);
  collections.set(set, collection);
  return collection;
};

// Имя иконки без хвоста начертания — по нему сравниваем с искомым словом
const baseName = (name: string, suffix: string): string =>
  suffix && name.endsWith(suffix) ? name.slice(0, -suffix.length) : name;

// Совпадение считается по целым словам имени, а не по вхождению подстроки:
// на «law» вхождение выдавало «lawn-mower» — газонокосилку юридической фирме.
// Короткое имя лучше длинного: по «coffee» нужен «coffee», а не «coffee-bean».
const score = (name: string, term: string): number => {
  if (name === term) return 100;

  const penalty = Math.min(20, name.length - term.length);
  const index = name.split('-').indexOf(term);

  if (index === 0) return 80 - penalty;
  if (index > 0) return 60 - penalty;

  // Термин сам из двух слов — тогда сравниваем целиком
  if (term.includes('-') && name.includes(term)) return 70 - penalty;

  return 0;
};

const RUSSIAN_NAMES: Record<string, string> = {
  restaurant: 'Ресторан',
  dining: 'Стол',
  food: 'Еда',
  cafe: 'Кафе',
  coffee: 'Кофе',
  cup: 'Чашка',
  technology: 'Технологии',
  computer: 'Компьютер',
  code: 'Код',
  software: 'Программы',
  beauty: 'Красота',
  shop: 'Магазин',
  store: 'Магазин',
  business: 'Бизнес',
  finance: 'Финансы',
  money: 'Деньги',
  bank: 'Банк',
  medical: 'Медицина',
  health: 'Здоровье',
  education: 'Обучение',
  book: 'Книга',
  construction: 'Стройка',
  building: 'Здание',
  tools: 'Инструменты',
  sports: 'Спорт',
  fitness: 'Спорт',
  travel: 'Путешествия',
  car: 'Автомобиль',
  transport: 'Транспорт',
  house: 'Дом',
  home: 'Дом',
  legal: 'Право',
  marketing: 'Маркетинг',
  delivery: 'Доставка',
  shipping: 'Доставка',
  design: 'Дизайн',
  web: 'Сайт',
  mobile: 'Телефон',
  phone: 'Телефон',
  mail: 'Почта',
  support: 'Поддержка',
  quality: 'Качество',
  speed: 'Скорость',
  security: 'Безопасность',
  shield: 'Защита',
  premium: 'Премиум',
  family: 'Семья',
  team: 'Команда',
  users: 'Люди',
  client: 'Клиент',
  star: 'Оценка',
  check: 'Готово',
  clock: 'Время',
  heart: 'Забота',
  settings: 'Настройки',
  'map-pin': 'Адрес',
  'arrow-right': 'Переход',
  truck: 'Доставка',
  package: 'Упаковка',
  box: 'Упаковка',
  scale: 'Право',
  gavel: 'Решение',
  handshake: 'Партнёрство',
  'heart-handshake': 'Партнёрство',
  headphones: 'Поддержка',
  wallet: 'Оплата',
  coins: 'Деньги',
  'credit-card': 'Оплата',
  'chart-line': 'Рост',
  'trending-up': 'Рост',
  cpu: 'Техника',
  terminal: 'Разработка',
  monitor: 'Экран',
  laptop: 'Ноутбук',
  smartphone: 'Телефон',
  cloud: 'Облако',
  wifi: 'Связь',
  palette: 'Палитра',
  brush: 'Дизайн',
  scissors: 'Ножницы',
  flower: 'Красота',
  sparkles: 'Особое',
  stethoscope: 'Медицина',
  dumbbell: 'Спорт',
  'graduation-cap': 'Обучение',
  'hard-hat': 'Стройка',
  hammer: 'Инструменты',
  wrench: 'Ремонт',
  ruler: 'Замер',
  plane: 'Перелёт',
  map: 'Маршрут',
  compass: 'Направление',
  luggage: 'Багаж',
  key: 'Ключи',
  briefcase: 'Дело',
  award: 'Награда',
  target: 'Цель',
  rocket: 'Скорость',
  lightbulb: 'Идея',
  megaphone: 'Реклама',
  'shopping-cart': 'Корзина',
  'shopping-bag': 'Покупка',
  storefront: 'Магазин',
  tag: 'Цена',
  receipt: 'Чек',
  'shield-check': 'Гарантия',
  utensils: 'Ресторан',
  'fork-knife': 'Ресторан',
  'chef-hat': 'Кухня',
  soup: 'Кухня',
  carrot: 'Еда',
  pizza: 'Пицца',
  cake: 'Десерт',
  calendar: 'Расписание',
  gift: 'Подарок',
  camera: 'Съёмка',
  leaf: 'Экология',
  'file-text': 'Документ',
  stamp: 'Печать',
};

const prettify = (name: string): string =>
  name.replace(/-/g, ' ').replace(/^./, (letter) => letter.toUpperCase());

// Название на русском: набор отдаёт английские имена, а документ русский.
// Имя иконки важнее понятия — по «delivery» и «shipping» подписи выходили
// одинаковыми у грузовика и коробки.
const titleFor = (term: string, name: string): string =>
  RUSSIAN_NAMES[name] || RUSSIAN_NAMES[term] || prettify(name);

export class IconSetService {
  // Ни одного сетевого запроса: поиск идёт по ключам локального набора
  pickIcons(style: string, industry: string, keywords = '', count = 12): BrandIcon[] {
    const choice = STYLE_SETS[style] || STYLE_SETS.modern;

    try {
      const collection = load(choice.set);
      const names = Object.keys(collection.icons);

      const candidates = names.filter(
        (name) =>
          (!choice.suffix || name.endsWith(choice.suffix)) &&
          !choice.exclude.some((tail) => name.endsWith(tail)) &&
          !NEVER.some((tail) => baseName(name, choice.suffix).endsWith(tail)) &&
          !name.includes('logo')
      );

      const picked = new Map<string, string>();

      const bestFor = (candidate: string): { name: string; score: number } | null => {
        let best: { name: string; score: number } | null = null;

        for (const name of candidates) {
          const value = score(baseName(name, choice.suffix), candidate);
          if (value > 0 && (!best || value > best.score)) best = { name, score: value };
        }

        return best;
      };

      const take = (terms: string[]) => {
        for (const term of terms) {
          if (picked.size >= count) return;

          // Понятие разворачивается в конкретные имена, берётся первое свободное:
          // иконки «legal» нет ни в одном наборе, «scale» и «gavel» есть
          const names = expand(term);

          for (const [index, candidate] of names.entries()) {
            const best = bestFor(candidate);

            // Занятое имя — повод перейти к следующему синониму, а не брать
            // второе по счёту имя того же корня: иначе в сетке оказывались
            // code, code-xml, qr-code, file-code и file-code-2 разом
            if (!best || picked.has(best.name)) continue;

            // Само понятие принимается только точным именем, если синонимы
            // есть: «shipping» иначе цеплял «shipping-container» вместо «truck»
            if (index === 0 && names.length > 1 && best.score < 100) continue;

            picked.set(best.name, term);
            break;
          }
        }
      };

      take(termsFor(industry, keywords));
      // Сетка добирается общими предметами: полупустая полоса выглядит сбоем,
      // а по абстрактным нишам вроде юридических услуг попаданий мало
      take(commonTerms);

      const used = new Set<string>();

      return [...picked.entries()]
        .map(([name, term]) => this.render(choice.set, name, term, choice.suffix))
        .filter((icon): icon is BrandIcon => !!icon)
        .map((icon) => {
          // Две иконки с одной подписью выглядят ошибкой: «Доставка» досталась
          // и грузовику, и коробке. Повтор подписывается собственным именем.
          if (!used.has(icon.name)) {
            used.add(icon.name);
            return icon;
          }

          const own = prettify(baseName(icon.id.split(':')[1], choice.suffix));
          used.add(own);
          return { ...icon, name: own };
        });
    } catch (error: any) {
      // Иконки — некритичный шаг: без них полоса просто выпадет из документа
      log.error('Не удалось подобрать иконки:', error.message);
      return [];
    }
  }

  private render(set: IconSetName, name: string, term: string, suffix: string): BrandIcon | null {
    const data = getIconData(load(set), name);

    if (!data) return null;

    const built = iconToSVG(data, { height: 'auto' });
    const info = SETS[set];

    return {
      id: `${set}:${name}`,
      name: titleFor(term, baseName(name, suffix)),
      description: '',
      usage: '',
      // replaceIDs обязателен: иконки вкладываются в одну полосу, и одинаковые
      // идентификаторы градиентов и масок столкнулись бы между собой
      svg:
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${built.attributes.viewBox}">` +
        `${replaceIDs(built.body)}</svg>`,
      category: 'icon',
      set,
      licence: info.licence,
    };
  }

  // Лицензии наборов, попавших в брендбук: их текст обязателен в архиве
  licences(icons: Array<{ set?: string }>): IconSetInfo[] {
    const used = new Set(icons.map((icon) => icon.set).filter(Boolean) as IconSetName[]);

    return [...used].map((set) => ({ set, ...SETS[set] }));
  }

  setFor(style: string): IconSetName {
    return (STYLE_SETS[style] || STYLE_SETS.modern).set;
  }

  info(set: IconSetName): IconSetInfo {
    return { set, ...SETS[set] };
  }
}

export const iconSetService = new IconSetService();
