import { colord } from 'colord';

export interface ColorPalette {
  name: string;
  hex: string;
  rgb: string;
  usage: string;
}

export interface BrandColorPalette {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  neutral: string;
  background: string;
  text: string;
}

// Расширенная база данных цветовых палитр по стилям с современными трендами
const COLOR_DATABASE = {
  "Современный": {
    keywords: ["технологии", "стартап", "финтех", "диджитал", "софт", "it", "инновации", "ai", "блокчейн", "криптовалюта"],
    palettes: [
      {
        name: "Modern Monochrome",
        primary: "#1A1A1A",
        secondary: "#4A4A4A",
        accent: "#6366F1",
        neutral: "#F5F5F5",
        background: "#FFFFFF",
        text: "#171717",
      },
      {
        name: "Digital Gradient",
        primary: "#667EEA",
        secondary: "#764BA2",
        accent: "#F093FB",
        neutral: "#F8FAFC",
        background: "#FFFFFF",
        text: "#1A202C",
      },
      {
        name: "Clean Slate",
        primary: "#374151",
        secondary: "#9CA3AF",
        accent: "#10B981",
        neutral: "#F3F4F6",
        background: "#FFFFFF",
        text: "#111827",
      },
      {
        name: "Cyber Blue",
        primary: "#1E3A8A",
        secondary: "#3B82F6",
        accent: "#06B6D4",
        neutral: "#EFF6FF",
        background: "#FFFFFF",
        text: "#1E3A8A",
      },
      {
        name: "Neon Minimal",
        primary: "#0F172A",
        secondary: "#475569",
        accent: "#00F5FF",
        neutral: "#F1F5F9",
        background: "#FFFFFF",
        text: "#0F172A",
      },
      {
        name: "Tech Gradient",
        primary: "#4C1D95",
        secondary: "#7C3AED",
        accent: "#A78BFA",
        neutral: "#F5F3FF",
        background: "#FFFFFF",
        text: "#1E1B4B",
      },
      {
        name: "Future Dark",
        primary: "#0C4A6E",
        secondary: "#0284C7",
        accent: "#38BDF8",
        neutral: "#F0F9FF",
        background: "#FFFFFF",
        text: "#0C4A6E",
      },
      {
        name: "AI Green",
        primary: "#064E3B",
        secondary: "#047857",
        accent: "#10B981",
        neutral: "#ECFDF5",
        background: "#FFFFFF",
        text: "#064E3B",
      },
    ],
  },
  "Классический": {
    keywords: ["юриспруденция", "образование", "наука", "банкинг", "литература", "премиум", "люкс", "элитный"],
    palettes: [
      {
        name: "Elegant Navy",
        primary: "#1E293B",
        secondary: "#64748B",
        accent: "#94A3B8",
        neutral: "#F8FAFC",
        background: "#FFFFFF",
        text: "#0F172A",
      },
      {
        name: "Royal Blue",
        primary: "#1E40AF",
        secondary: "#3B82F6",
        accent: "#93C5FD",
        neutral: "#EFF6FF",
        background: "#FFFFFF",
        text: "#1E3A8A",
      },
      {
        name: "Heritage Gold",
        primary: "#92400E",
        secondary: "#D97706",
        accent: "#F59E0B",
        neutral: "#FFFBEB",
        background: "#FFFFFF",
        text: "#92400E",
      },
      {
        name: "Sophisticated Stone",
        primary: "#44403C",
        secondary: "#78716C",
        accent: "#A8A29E",
        neutral: "#F5F5F4",
        background: "#FFFFFF",
        text: "#1C1917",
      },
      {
        name: "Timeless Emerald",
        primary: "#065F46",
        secondary: "#047857",
        accent: "#10B981",
        neutral: "#ECFDF5",
        background: "#FFFFFF",
        text: "#064E3B",
      },
      {
        name: "Burgundy Elegance",
        primary: "#7C2D12",
        secondary: "#DC2626",
        accent: "#F87171",
        neutral: "#FEF2F2",
        background: "#FFFFFF",
        text: "#7C2D12",
      },
      {
        name: "Charcoal Luxury",
        primary: "#18181B",
        secondary: "#3F3F46",
        accent: "#71717A",
        neutral: "#F4F4F5",
        background: "#FFFFFF",
        text: "#18181B",
      },
    ],
  },
  "Креативный": {
    keywords: ["дизайн", "маркетинг", "арт", "медиа", "креатив", "фэшн", "фотография", "видео", "реклама"],
    palettes: [
      {
        name: "Creative Gradient",
        primary: "#EC4899",
        secondary: "#F472B6",
        accent: "#A855F7",
        neutral: "#FAF5FF",
        background: "#FFFFFF",
        text: "#86198F",
      },
      {
        name: "Artistic Coral",
        primary: "#DC2626",
        secondary: "#F87171",
        accent: "#FED7AA",
        neutral: "#FEF2F2",
        background: "#FFFFFF",
        text: "#991B1B",
      },
      {
        name: "Modern Coral",
        primary: "#BE185D",
        secondary: "#F472B6",
        accent: "#FDE68A",
        neutral: "#FDF2F8",
        background: "#FFFFFF",
        text: "#9D174D",
      },
      {
        name: "Vibrant Teal",
        primary: "#0D9488",
        secondary: "#14B8A6",
        accent: "#F59E0B",
        neutral: "#F0FDFA",
        background: "#FFFFFF",
        text: "#0F766E",
      },
      {
        name: "Sunset Orange",
        primary: "#EA580C",
        secondary: "#FB923C",
        accent: "#FBBF24",
        neutral: "#FFF7ED",
        background: "#FFFFFF",
        text: "#C2410C",
      },
      {
        name: "Electric Purple",
        primary: "#7C3AED",
        secondary: "#A78BFA",
        accent: "#F3E8FF",
        neutral: "#F5F3FF",
        background: "#FFFFFF",
        text: "#5B21B6",
      },
      {
        name: "Cosmic Pink",
        primary: "#BE185D",
        secondary: "#EC4899",
        accent: "#06B6D4",
        neutral: "#FDF2F8",
        background: "#FFFFFF",
        text: "#9D174D",
      },
      {
        name: "Neon Lime",
        primary: "#65A30D",
        secondary: "#84CC16",
        accent: "#FACC15",
        neutral: "#F7FEE7",
        background: "#FFFFFF",
        text: "#3F6212",
      },
    ],
  },
  "Профессиональный": {
    keywords: ["корпоративный", "b2b", "финансы", "аналитика", "консалтинг", "юридические", "медицина", "архитектура"],
    palettes: [
      {
        name: "Corporate Blue",
        primary: "#1E40AF",
        secondary: "#3B82F6",
        accent: "#60A5FA",
        neutral: "#EFF6FF",
        background: "#FFFFFF",
        text: "#1E3A8A",
      },
      {
        name: "Professional Gray",
        primary: "#374151",
        secondary: "#6B7280",
        accent: "#9CA3AF",
        neutral: "#F3F4F6",
        background: "#FAFAFA",
        text: "#111827",
      },
      {
        name: "Executive Navy",
        primary: "#0F172A",
        secondary: "#334155",
        accent: "#64748B",
        neutral: "#F8FAFC",
        background: "#FFFFFF",
        text: "#020617",
      },
      {
        name: "Business Teal",
        primary: "#0F766E",
        secondary: "#14B8A6",
        accent: "#5EEAD4",
        neutral: "#F0FDFA",
        background: "#FFFFFF",
        text: "#134E4A",
      },
      {
        name: "Financial Green",
        primary: "#166534",
        secondary: "#16A34A",
        accent: "#4ADE80",
        neutral: "#F0FDF4",
        background: "#FFFFFF",
        text: "#14532D",
      },
      {
        name: "Legal Indigo",
        primary: "#3730A3",
        secondary: "#6366F1",
        accent: "#A5B4FC",
        neutral: "#EEF2FF",
        background: "#FFFFFF",
        text: "#312E81",
      },
      {
        name: "Medical Blue",
        primary: "#1E3A8A",
        secondary: "#3B82F6",
        accent: "#93C5FD",
        neutral: "#DBEAFE",
        background: "#FFFFFF",
        text: "#1E40AF",
      },
    ],
  },
  "Игривый": {
    keywords: ["дети", "развлечения", "игры", "еда", "инфлюенсеры", "блог", "социальные", "молодежь"],
    palettes: [
      {
        name: "Playful Rainbow",
        primary: "#EC4899",
        secondary: "#8B5CF6",
        accent: "#06B6D4",
        neutral: "#F9FAFB",
        background: "#FFFFFF",
        text: "#111827",
      },
      {
        name: "Sunny Yellow",
        primary: "#F59E0B",
        secondary: "#FCD34D",
        accent: "#FDE68A",
        neutral: "#FFFBEB",
        background: "#FFFFFF",
        text: "#92400E",
      },
      {
        name: "Bubblegum Pink",
        primary: "#EC4899",
        secondary: "#F472B6",
        accent: "#FBCFE8",
        neutral: "#FDF2F8",
        background: "#FFFFFF",
        text: "#BE185D",
      },
      {
        name: "Ocean Blue",
        primary: "#0EA5E9",
        secondary: "#38BDF8",
        accent: "#BAE6FD",
        neutral: "#F0F9FF",
        background: "#FFFFFF",
        text: "#0C4A6E",
      },
      {
        name: "Mint Green",
        primary: "#10B981",
        secondary: "#34D399",
        accent: "#A7F3D0",
        neutral: "#ECFDF5",
        background: "#FFFFFF",
        text: "#047857",
      },
      {
        name: "Lavender Dream",
        primary: "#8B5CF6",
        secondary: "#A78BFA",
        accent: "#DDD6FE",
        neutral: "#F5F3FF",
        background: "#FFFFFF",
        text: "#5B21B6",
      },
      {
        name: "Peach Sunset",
        primary: "#FB923C",
        secondary: "#FDBA74",
        accent: "#FED7AA",
        neutral: "#FFF7ED",
        background: "#FFFFFF",
        text: "#C2410C",
      },
      {
        name: "Candy Colors",
        primary: "#F472B6",
        secondary: "#A78BFA",
        accent: "#34D399",
        neutral: "#F9FAFB",
        background: "#FFFFFF",
        text: "#BE185D",
      },
    ],
  },
  "Минималистичный": {
    keywords: ["минимализм", "простота", "скандинавский", "архитектура", "интерьер", "мода", "украшения"],
    palettes: [
      {
        name: "Pure Monochrome",
        primary: "#000000",
        secondary: "#6B7280",
        accent: "#9CA3AF",
        neutral: "#F9FAFB",
        background: "#FFFFFF",
        text: "#111827",
      },
      {
        name: "Scandinavian Gray",
        primary: "#374151",
        secondary: "#6B7280",
        accent: "#D1D5DB",
        neutral: "#F3F4F6",
        background: "#FFFFFF",
        text: "#1F2937",
      },
      {
        name: "Warm Beige",
        primary: "#78716C",
        secondary: "#A8A29E",
        accent: "#D6D3D1",
        neutral: "#F5F5F4",
        background: "#FFFFFF",
        text: "#44403C",
      },
      {
        name: "Cool Stone",
        primary: "#475569",
        secondary: "#64748B",
        accent: "#CBD5E1",
        neutral: "#F1F5F9",
        background: "#FFFFFF",
        text: "#334155",
      },
      {
        name: "Soft Charcoal",
        primary: "#3F3F46",
        secondary: "#71717A",
        accent: "#D4D4D8",
        neutral: "#F4F4F5",
        background: "#FFFFFF",
        text: "#27272A",
      },
    ],
  },
  "Эко-стиль": {
    keywords: ["экология", "природа", "органический", "био", "sustainable", "green", "растения", "здоровье"],
    palettes: [
      {
        name: "Forest Green",
        primary: "#166534",
        secondary: "#16A34A",
        accent: "#4ADE80",
        neutral: "#F0FDF4",
        background: "#FFFFFF",
        text: "#14532D",
      },
      {
        name: "Earth Tones",
        primary: "#92400E",
        secondary: "#A16207",
        accent: "#CA8A04",
        neutral: "#FFFBEB",
        background: "#FFFFFF",
        text: "#78350F",
      },
      {
        name: "Ocean Breeze",
        primary: "#0F766E",
        secondary: "#14B8A6",
        accent: "#5EEAD4",
        neutral: "#F0FDFA",
        background: "#FFFFFF",
        text: "#134E4A",
      },
      {
        name: "Sky Blue",
        primary: "#0369A1",
        secondary: "#0EA5E9",
        accent: "#7DD3FC",
        neutral: "#F0F9FF",
        background: "#FFFFFF",
        text: "#0C4A6E",
      },
      {
        name: "Moss Green",
        primary: "#365314",
        secondary: "#65A30D",
        accent: "#A3E635",
        neutral: "#F7FEE7",
        background: "#FFFFFF",
        text: "#1A2E05",
      },
    ],
  },
};

// Улучшенный сервис для работы с цветами
export class ColorService {
  // Улучшенная логика определения стиля с приоритетами и контекстом
  private determineColorStyle(keywords: string): string {
    const keywordLower = keywords.toLowerCase();
    const styleScores: { [key: string]: number } = {};
    
    // Инициализируем счетчики для каждого стиля
    for (const style of Object.keys(COLOR_DATABASE)) {
      styleScores[style] = 0;
    }
    
    // Анализируем каждое слово в ключевых словах
    const words = keywordLower.split(/\s+|,|;|\|/);
    
    for (const [style, data] of Object.entries(COLOR_DATABASE)) {
      const styleKeywords = data.keywords;
      
      // Точное совпадение ключевых слов
      for (const keyword of styleKeywords) {
        if (keywordLower.includes(keyword)) {
          styleScores[style] += 10;
        }
        
        // Частичное совпадение слов
        for (const word of words) {
          if (word.length > 2 && keyword.includes(word)) {
            styleScores[style] += 5;
          }
        }
      }
    }
    
    // Дополнительная логика для более точного определения стиля
    if (keywordLower.includes('минимал') || keywordLower.includes('простой') || 
        keywordLower.includes('скандинавский') || keywordLower.includes('clean')) {
      styleScores['Минималистичный'] += 15;
    }
    
    if (keywordLower.includes('эко') || keywordLower.includes('природа') || 
        keywordLower.includes('органический') || keywordLower.includes('био') ||
        keywordLower.includes('зелен') || keywordLower.includes('sustainable')) {
      styleScores['Эко-стиль'] += 15;
    }
    
    if (keywordLower.includes('креатив') || keywordLower.includes('искусство') || 
        keywordLower.includes('дизайн') || keywordLower.includes('творчество') ||
        keywordLower.includes('фэшн') || keywordLower.includes('медиа')) {
      styleScores['Креативный'] += 12;
    }
    
    if (keywordLower.includes('игра') || keywordLower.includes('дети') || 
        keywordLower.includes('развлечения') || keywordLower.includes('веселье') ||
        keywordLower.includes('молодежь') || keywordLower.includes('блог')) {
      styleScores['Игривый'] += 12;
    }
    
    if (keywordLower.includes('технологии') || keywordLower.includes('стартап') || 
        keywordLower.includes('инновации') || keywordLower.includes('цифровой') ||
        keywordLower.includes('софт') || keywordLower.includes('ai') ||
        keywordLower.includes('блокчейн')) {
      styleScores['Современный'] += 12;
    }
    
    if (keywordLower.includes('традиции') || keywordLower.includes('история') || 
        keywordLower.includes('классика') || keywordLower.includes('премиум') ||
        keywordLower.includes('люкс') || keywordLower.includes('элитный')) {
      styleScores['Классический'] += 12;
    }
    
    if (keywordLower.includes('бизнес') || keywordLower.includes('консалтинг') || 
        keywordLower.includes('корпоративный') || keywordLower.includes('офис') ||
        keywordLower.includes('b2b') || keywordLower.includes('финансы')) {
      styleScores['Профессиональный'] += 12;
    }
    
    // Возвращаем стиль с наибольшим счетом
    const maxScore = Math.max(...Object.values(styleScores));
    const bestStyle = Object.keys(styleScores).find(style => styleScores[style] === maxScore);
    
    // Если никакой стиль не набрал достаточно очков, возвращаем современный
    return bestStyle && maxScore > 0 ? bestStyle : 'Современный';
  }

  // Улучшенная генерация цветовой палитры с большим разнообразием
  async generateColorPalette(keywords: string): Promise<ColorPalette[]> {
    const style = this.determineColorStyle(keywords);
    
    const styleData = COLOR_DATABASE[style as keyof typeof COLOR_DATABASE];
    
    // Выбираем случайную палитру из доступных
    const randomPalette = styleData.palettes[Math.floor(Math.random() * styleData.palettes.length)];
    
    const colors: ColorPalette[] = [];
    
    // Основные цвета бренда
    colors.push({
      name: 'Основной цвет',
      hex: randomPalette.primary,
      rgb: colord(randomPalette.primary).toRgbString(),
      usage: 'Логотип, заголовки, основные элементы'
    });
    
    colors.push({
      name: 'Дополнительный цвет',
      hex: randomPalette.secondary,
      rgb: colord(randomPalette.secondary).toRgbString(),
      usage: 'Подзаголовки, кнопки, навигация'
    });
    
    colors.push({
      name: 'Акцентный цвет',
      hex: randomPalette.accent,
      rgb: colord(randomPalette.accent).toRgbString(),
      usage: 'Выделения, призывы к действию, иконки'
    });
    
    // Генерируем дополнительные оттенки с помощью colord
    const primaryColor = colord(randomPalette.primary);
    const secondaryColor = colord(randomPalette.secondary);
    
    // Светлые оттенки для фонов
    colors.push({
      name: 'Светлый оттенок',
      hex: primaryColor.lighten(0.4).saturate(-0.3).toHex(),
      rgb: primaryColor.lighten(0.4).saturate(-0.3).toRgbString(),
      usage: 'Фоны карточек, секций'
    });
    
    // Темный оттенок для контраста
    colors.push({
      name: 'Темный оттенок',
      hex: primaryColor.darken(0.2).saturate(0.1).toHex(),
      rgb: primaryColor.darken(0.2).saturate(0.1).toRgbString(),
      usage: 'Границы, разделители, тени'
    });
    
    // Нейтральный цвет
    colors.push({
      name: 'Нейтральный',
      hex: randomPalette.neutral,
      rgb: colord(randomPalette.neutral).toRgbString(),
      usage: 'Вспомогательные элементы, подложки'
    });
    
    // Дополнительный акцент на основе вторичного цвета
    colors.push({
      name: 'Вторичный акцент',
      hex: secondaryColor.lighten(0.15).saturate(0.2).toHex(),
      rgb: secondaryColor.lighten(0.15).saturate(0.2).toRgbString(),
      usage: 'Дополнительные выделения, состояния hover'
    });
    
    return colors;
  }
}

// Экспорт экземпляра для переиспользования
export const colorService = new ColorService(); 