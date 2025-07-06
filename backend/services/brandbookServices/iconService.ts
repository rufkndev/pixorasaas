import axios from 'axios';

export interface Icon {
  id: string;
  name: string;
  svg: string;
  description: string;
  usage: string;
  category: 'icon' | 'frame' | 'pattern' | 'divider' | 'decoration' | 'background';
  icon?: string; // Для Iconify формата "prefix:name"
  libraryRank?: number;
  matchScore?: number;
}

// Мэппинг стилей бренда к библиотекам Iconify
const BRAND_STYLE_MAPPING = {
  'Современный': [
    { prefix: 'lucide', name: 'Lucide Icons', priority: 1 },
    { prefix: 'tabler', name: 'Tabler Icons', priority: 2 },
    { prefix: 'heroicons-outline', name: 'Heroicons Outline', priority: 3 }
  ],
  'Классический': [
    { prefix: 'fa-solid', name: 'Font Awesome Solid', priority: 1 },
    { prefix: 'mdi', name: 'Material Icons', priority: 2 },
    { prefix: 'material-symbols-outlined', name: 'Material Symbols Outlined', priority: 3 }
  ],
  'Креативный': [
    { prefix: 'ph', name: 'Phosphor Icons', priority: 1 },
    { prefix: 'icon-park-outline', name: 'IconPark Outline', priority: 2 },
    { prefix: 'icon-park-twotone', name: 'IconPark TwoTone', priority: 3 }
  ],
  'Профессиональный': [
    { prefix: 'material-symbols-rounded', name: 'Material Symbols Rounded', priority: 1 },
    { prefix: 'simple-icons', name: 'Simple Icons', priority: 2 },
    { prefix: 'carbon', name: 'Carbon Icons', priority: 3 }
  ],
  'Игривый': [
    { prefix: 'ph', name: 'Phosphor Duotone', priority: 1 },
    { prefix: 'emojione', name: 'EmojiOne', priority: 2 },
    { prefix: 'twemoji', name: 'Twemoji', priority: 3 },
    { prefix: 'line-md', name: 'Line-MD', priority: 4 }
  ]
};

// Словарь для перевода русских ключевых слов на английский
const TRANSLATION_DICTIONARY: { [key: string]: string[] } = {
  // Ниши бизнеса
  'ресторан': ['restaurant', 'dining', 'food', 'cafe'],
  'кафе': ['cafe', 'coffee', 'restaurant', 'cup'],
  'it': ['technology', 'computer', 'code', 'software'],
  'айти': ['technology', 'computer', 'code', 'software'],
  'технологии': ['technology', 'tech', 'digital', 'innovation'],
  'салон красоты': ['beauty', 'salon', 'hair', 'makeup'],
  'красота': ['beauty', 'makeup', 'cosmetics', 'salon'],
  'магазин': ['shop', 'store', 'retail', 'shopping'],
  'бизнес': ['business', 'office', 'professional', 'company'],
  'финансы': ['finance', 'money', 'bank', 'payment'],
  'банк': ['bank', 'finance', 'money', 'payment'],
  'медицина': ['medical', 'health', 'doctor', 'hospital'],
  'здоровье': ['health', 'medical', 'wellness', 'fitness'],
  'образование': ['education', 'school', 'learning', 'book'],
  'строительство': ['construction', 'building', 'architecture', 'tools'],
  'спорт': ['sports', 'fitness', 'gym', 'exercise'],
  'путешествия': ['travel', 'tourism', 'vacation', 'flight'],
  'автомобили': ['car', 'automotive', 'vehicle', 'transport'],
  'недвижимость': ['real-estate', 'house', 'property', 'building'],
  'юридические': ['legal', 'law', 'justice', 'court'],
  'консалтинг': ['consulting', 'advisor', 'strategy', 'business'],
  'маркетинг': ['marketing', 'advertising', 'promotion', 'campaign'],
  'логистика': ['logistics', 'shipping', 'delivery', 'transport'],
  'производство': ['manufacturing', 'factory', 'industry', 'production'],
  'мода': ['fashion', 'clothing', 'style', 'design'],
  'развлечения': ['entertainment', 'fun', 'music', 'game'],
  
  // Продукты и услуги
  'пицца': ['pizza', 'food', 'italian'],
  'кофе': ['coffee', 'cafe', 'espresso'],
  'еда': ['food', 'meal', 'dining'],
  'кухня': ['kitchen', 'cooking', 'chef'],
  'повар': ['chef', 'cook', 'cooking'],
  'стрижка': ['haircut', 'hair', 'salon'],
  'маникюр': ['manicure', 'nails', 'beauty'],
  'макияж': ['makeup', 'cosmetics', 'beauty'],
  'продажи': ['sales', 'selling', 'commerce'],
  'покупки': ['shopping', 'purchase', 'buy'],
  'доставка': ['delivery', 'shipping', 'transport'],
  'обучение': ['training', 'education', 'learning'],
  'консультации': ['consulting', 'advice', 'support'],
  'ремонт': ['repair', 'fix', 'maintenance'],
  'дизайн': ['design', 'creative', 'art'],
  'разработка': ['development', 'coding', 'programming'],
  'веб': ['web', 'website', 'online'],
  'мобильный': ['mobile', 'phone', 'app'],
  'приложение': ['app', 'application', 'software'],
  'сайт': ['website', 'web', 'online'],
  'интернет': ['internet', 'online', 'web'],
  'цифровой': ['digital', 'online', 'tech'],
  'онлайн': ['online', 'internet', 'web'],
  'сервис': ['service', 'support', 'help'],
  'поддержка': ['support', 'help', 'service'],
  'качество': ['quality', 'premium', 'excellence'],
  'скорость': ['speed', 'fast', 'quick'],
  'надежность': ['reliability', 'trust', 'secure'],
  'безопасность': ['security', 'safe', 'protection'],
  'экономия': ['savings', 'economy', 'budget'],
  'премиум': ['premium', 'luxury', 'exclusive'],
  'инновации': ['innovation', 'modern', 'advanced'],
  'традиции': ['tradition', 'classic', 'heritage'],
  'семья': ['family', 'home', 'personal'],
  'дети': ['children', 'kids', 'family'],
  'молодежь': ['youth', 'young', 'modern'],
  'профессионалы': ['professional', 'expert', 'specialist'],
  'клиенты': ['client', 'customer', 'user'],
  'команда': ['team', 'group', 'collaboration'],
  'творчество': ['creativity', 'art', 'design'],
  'искусство': ['art', 'creative', 'design']
};

// Декоративные элементы по индустриям и категориям
const INDUSTRY_DECORATIVE_MAPPING: { [key: string]: { [key: string]: string[] } } = {
  'ресторан': {
    'pattern': ['dots', 'grid', 'circle', 'pattern'],
    'shape': ['circle', 'heart', 'star', 'diamond'],
    'background': ['texture', 'gradient', 'wave', 'abstract'],
    'decoration': ['flourish', 'ornament', 'leaf', 'flower'],
    'divider': ['line', 'wave', 'separator', 'border']
  },
  'кафе': {
    'pattern': ['dots', 'circle', 'wave', 'pattern'],
    'shape': ['circle', 'heart', 'star', 'bean'],
    'background': ['texture', 'gradient', 'warm', 'cozy'],
    'decoration': ['flourish', 'ornament', 'leaf', 'swirl'],
    'divider': ['line', 'wave', 'dots', 'separator']
  },
  'it': {
    'pattern': ['grid', 'dots', 'circuit', 'pattern'],
    'shape': ['square', 'triangle', 'hexagon', 'diamond'],
    'background': ['gradient', 'abstract', 'geometric', 'digital'],
    'decoration': ['geometric', 'minimal', 'tech', 'modern'],
    'divider': ['line', 'separator', 'border', 'geometric']
  },
  'айти': {
    'pattern': ['grid', 'dots', 'circuit', 'pattern'],
    'shape': ['square', 'triangle', 'hexagon', 'diamond'],
    'background': ['gradient', 'abstract', 'geometric', 'digital'],
    'decoration': ['geometric', 'minimal', 'tech', 'modern'],
    'divider': ['line', 'separator', 'border', 'geometric']
  },
  'технологии': {
    'pattern': ['grid', 'circuit', 'network', 'pattern'],
    'shape': ['hexagon', 'triangle', 'square', 'diamond'],
    'background': ['digital', 'abstract', 'tech', 'gradient'],
    'decoration': ['modern', 'geometric', 'minimal', 'tech'],
    'divider': ['line', 'geometric', 'separator', 'border']
  },
  'салон красоты': {
    'pattern': ['flourish', 'ornament', 'elegant', 'pattern'],
    'shape': ['heart', 'star', 'flower', 'circle'],
    'background': ['elegant', 'soft', 'gradient', 'luxury'],
    'decoration': ['flourish', 'ornament', 'elegant', 'beauty'],
    'divider': ['elegant', 'flourish', 'ornament', 'separator']
  },
  'красота': {
    'pattern': ['flourish', 'ornament', 'elegant', 'pattern'],
    'shape': ['heart', 'star', 'flower', 'circle'],
    'background': ['elegant', 'soft', 'gradient', 'luxury'],
    'decoration': ['flourish', 'ornament', 'elegant', 'beauty'],
    'divider': ['elegant', 'flourish', 'ornament', 'separator']
  },
  'магазин': {
    'pattern': ['grid', 'dots', 'pattern', 'texture'],
    'shape': ['square', 'circle', 'diamond', 'star'],
    'background': ['clean', 'modern', 'simple', 'gradient'],
    'decoration': ['modern', 'clean', 'simple', 'accent'],
    'divider': ['line', 'separator', 'border', 'clean']
  },
  'бизнес': {
    'pattern': ['grid', 'lines', 'professional', 'pattern'],
    'shape': ['square', 'triangle', 'diamond', 'circle'],
    'background': ['professional', 'clean', 'corporate', 'gradient'],
    'decoration': ['professional', 'corporate', 'clean', 'modern'],
    'divider': ['line', 'professional', 'separator', 'border']
  },
  'финансы': {
    'pattern': ['grid', 'lines', 'secure', 'pattern'],
    'shape': ['square', 'diamond', 'triangle', 'shield'],
    'background': ['trust', 'secure', 'professional', 'gradient'],
    'decoration': ['professional', 'trust', 'secure', 'classic'],
    'divider': ['line', 'professional', 'separator', 'border']
  },
  'медицина': {
    'pattern': ['dots', 'cross', 'clean', 'pattern'],
    'shape': ['cross', 'circle', 'heart', 'plus'],
    'background': ['clean', 'medical', 'trust', 'gradient'],
    'decoration': ['medical', 'clean', 'trust', 'care'],
    'divider': ['line', 'clean', 'separator', 'medical']
  },
  'здоровье': {
    'pattern': ['dots', 'wave', 'natural', 'pattern'],
    'shape': ['circle', 'heart', 'leaf', 'wave'],
    'background': ['natural', 'health', 'wellness', 'gradient'],
    'decoration': ['natural', 'wellness', 'healthy', 'organic'],
    'divider': ['wave', 'natural', 'separator', 'organic']
  },
  'образование': {
    'pattern': ['dots', 'grid', 'academic', 'pattern'],
    'shape': ['square', 'triangle', 'circle', 'star'],
    'background': ['academic', 'knowledge', 'learning', 'gradient'],
    'decoration': ['academic', 'knowledge', 'smart', 'learning'],
    'divider': ['line', 'academic', 'separator', 'border']
  },
  'спорт': {
    'pattern': ['dynamic', 'energy', 'active', 'pattern'],
    'shape': ['circle', 'triangle', 'diamond', 'star'],
    'background': ['energy', 'dynamic', 'active', 'gradient'],
    'decoration': ['dynamic', 'energy', 'sport', 'active'],
    'divider': ['dynamic', 'energy', 'separator', 'active']
  },
  'мода': {
    'pattern': ['elegant', 'style', 'fashion', 'pattern'],
    'shape': ['diamond', 'star', 'heart', 'circle'],
    'background': ['fashion', 'style', 'elegant', 'gradient'],
    'decoration': ['fashion', 'style', 'elegant', 'chic'],
    'divider': ['elegant', 'style', 'separator', 'chic']
  },
  'банк': {
    'pattern': ['grid', 'lines', 'secure', 'pattern'],
    'shape': ['square', 'diamond', 'shield', 'circle'],
    'background': ['trust', 'secure', 'stable', 'gradient'],
    'decoration': ['classic', 'trust', 'secure', 'professional'],
    'divider': ['line', 'classic', 'separator', 'border']
  },
  'строительство': {
    'pattern': ['grid', 'structure', 'brick', 'pattern'],
    'shape': ['square', 'triangle', 'diamond', 'hexagon'],
    'background': ['solid', 'structure', 'build', 'gradient'],
    'decoration': ['solid', 'structure', 'strong', 'build'],
    'divider': ['line', 'solid', 'separator', 'border']
  },
  'путешествия': {
    'pattern': ['wave', 'journey', 'adventure', 'pattern'],
    'shape': ['circle', 'triangle', 'star', 'compass'],
    'background': ['adventure', 'journey', 'explore', 'gradient'],
    'decoration': ['adventure', 'journey', 'explore', 'travel'],
    'divider': ['wave', 'journey', 'separator', 'explore']
  },
  'автомобили': {
    'pattern': ['speed', 'dynamic', 'road', 'pattern'],
    'shape': ['circle', 'triangle', 'diamond', 'hexagon'],
    'background': ['speed', 'automotive', 'dynamic', 'gradient'],
    'decoration': ['speed', 'automotive', 'dynamic', 'drive'],
    'divider': ['line', 'speed', 'separator', 'road']
  },
  'недвижимость': {
    'pattern': ['grid', 'structure', 'home', 'pattern'],
    'shape': ['square', 'triangle', 'diamond', 'house'],
    'background': ['home', 'property', 'stable', 'gradient'],
    'decoration': ['home', 'property', 'elegant', 'stable'],
    'divider': ['line', 'elegant', 'separator', 'border']
  },
  'юридические': {
    'pattern': ['grid', 'justice', 'law', 'pattern'],
    'shape': ['square', 'triangle', 'shield', 'balance'],
    'background': ['justice', 'law', 'trust', 'gradient'],
    'decoration': ['justice', 'law', 'professional', 'trust'],
    'divider': ['line', 'professional', 'separator', 'border']
  },
  'консалтинг': {
    'pattern': ['grid', 'strategy', 'professional', 'pattern'],
    'shape': ['triangle', 'diamond', 'circle', 'arrow'],
    'background': ['strategy', 'consulting', 'professional', 'gradient'],
    'decoration': ['strategy', 'consulting', 'expert', 'professional'],
    'divider': ['line', 'professional', 'separator', 'border']
  },
  'маркетинг': {
    'pattern': ['dynamic', 'creative', 'trend', 'pattern'],
    'shape': ['triangle', 'star', 'circle', 'diamond'],
    'background': ['creative', 'marketing', 'trend', 'gradient'],
    'decoration': ['creative', 'marketing', 'trend', 'brand'],
    'divider': ['creative', 'trend', 'separator', 'brand']
  },
  'логистика': {
    'pattern': ['grid', 'network', 'flow', 'pattern'],
    'shape': ['square', 'arrow', 'triangle', 'hexagon'],
    'background': ['flow', 'logistics', 'network', 'gradient'],
    'decoration': ['flow', 'logistics', 'efficient', 'network'],
    'divider': ['line', 'flow', 'separator', 'network']
  },
  'производство': {
    'pattern': ['grid', 'industrial', 'machine', 'pattern'],
    'shape': ['square', 'hexagon', 'triangle', 'gear'],
    'background': ['industrial', 'manufacturing', 'production', 'gradient'],
    'decoration': ['industrial', 'manufacturing', 'precision', 'quality'],
    'divider': ['line', 'industrial', 'separator', 'border']
  },
  'развлечения': {
    'pattern': ['fun', 'entertainment', 'joy', 'pattern'],
    'shape': ['star', 'circle', 'heart', 'smile'],
    'background': ['fun', 'entertainment', 'joy', 'gradient'],
    'decoration': ['fun', 'entertainment', 'joy', 'celebration'],
    'divider': ['fun', 'joy', 'separator', 'celebration']
  }
};

// Универсальные декоративные элементы (fallback)
const DEFAULT_DECORATIVE_MAPPING = {
  'pattern': ['pattern', 'texture', 'dots', 'grid', 'lines'],
  'shape': ['circle', 'square', 'triangle', 'star', 'diamond'],
  'background': ['background', 'texture', 'gradient', 'abstract'],
  'decoration': ['decoration', 'ornament', 'flourish', 'accent'],
  'divider': ['divider', 'separator', 'line', 'border']
};

export class IconService {
  private readonly baseUrl = 'https://api.iconify.design';
  private readonly cdnUrl = 'https://api.iconify.design';

  constructor() {
    // IconService initialized with Iconify API
  }

  // Главный метод генерации иконок и элементов
  async generateIcons(
    brandStyle: string, 
    industry: string, 
    keywords: string = ''
  ): Promise<Icon[]> {
    try {
      const [brandIcons, decorativeElements] = await Promise.all([
        this.generateBrandIcons(brandStyle, industry, keywords),
        this.generateDecorativeElements(brandStyle, industry)
      ]);
      
      const allItems = [...brandIcons, ...decorativeElements];
      
      return allItems;
      
    } catch (error) {
      console.error('Error generating icons and elements:', error);
      return this.createFallbackIconsAndElements(brandStyle, industry);
    }
  }

  // Генерация 5 фирменных иконок
  private async generateBrandIcons(
    brandStyle: string, 
    industry: string, 
    keywords: string = ''
  ): Promise<Icon[]> {
    const styleLibraries = BRAND_STYLE_MAPPING[brandStyle as keyof typeof BRAND_STYLE_MAPPING] || 
                          BRAND_STYLE_MAPPING['Профессиональный'];
    
    // Переводим ключевые слова на английский
    const translatedKeywords = this.translateToEnglish(industry, keywords);

    const icons: Icon[] = [];
    const usedIcons = new Set<string>();
    
    // Поиск иконок по каждому переведенному ключевому слову
    for (const keyword of translatedKeywords.slice(0, 8)) {
      if (icons.length >= 5) break;
      
      const searchResults = await this.searchIconsByKeyword(keyword, styleLibraries, brandStyle);
      
      for (const result of searchResults) {
        if (icons.length >= 5) break;
        
        const iconKey = result.icon;
        if (!usedIcons.has(iconKey)) {
          usedIcons.add(iconKey);
          
          const svg = await this.getIconSVG(iconKey);
          if (svg) {
            icons.push({
              id: `brand-icon-${iconKey.replace(':', '-')}`,
              name: this.getIconName(result.name || keyword),
              svg,
              description: `Фирменная иконка в стиле ${brandStyle}`,
              usage: 'Использование в брендинге: визитки, лендинги, упаковка, соцсети',
              category: 'icon',
              icon: iconKey,
              libraryRank: result.libraryRank,
              matchScore: result.matchScore
            });
          }
        }
      }
    }

    // Дополняем fallback иконками если нужно
    while (icons.length < 5) {
      const fallbackIcon = this.createFallbackIcon(brandStyle, industry, icons.length);
      icons.push(fallbackIcon);
    }
    
    return icons;
  }

  // Перевод ключевых слов и ниши бизнеса на английский
  private translateToEnglish(industry: string, keywords: string): string[] {
    const translatedTerms: string[] = [];
    const allTerms = [industry, ...keywords.split(/[\s,.-]+/)].filter(term => term.length > 1);
    
    for (const term of allTerms) {
      const normalizedTerm = term.toLowerCase().trim();
      
      // Прямой перевод из словаря
      if (TRANSLATION_DICTIONARY[normalizedTerm]) {
        translatedTerms.push(...TRANSLATION_DICTIONARY[normalizedTerm]);
        continue;
      }
      
      // Поиск частичных совпадений в словаре
      let found = false;
      for (const [russianTerm, englishTerms] of Object.entries(TRANSLATION_DICTIONARY)) {
        if (normalizedTerm.includes(russianTerm) || russianTerm.includes(normalizedTerm)) {
          translatedTerms.push(...englishTerms);
          found = true;
          break;
        }
      }
      
      // Если уже на английском или нет перевода, используем как есть
      if (!found) {
        if (/^[a-zA-Z\s]+$/.test(normalizedTerm)) {
          translatedTerms.push(normalizedTerm);
        }
      }
    }
    
    // Убираем дубликаты и возвращаем уникальные термины
    const uniqueTerms = [...new Set(translatedTerms)];
    
    return uniqueTerms;
  }

  // Генерация 5 декоративных элементов с учетом индустрии
  private async generateDecorativeElements(brandStyle: string, industry: string): Promise<Icon[]> {
    const styleLibraries = BRAND_STYLE_MAPPING[brandStyle as keyof typeof BRAND_STYLE_MAPPING] || 
                          BRAND_STYLE_MAPPING['Профессиональный'];
    
    // Получаем ключевые слова для индустрии или используем универсальные
    const industryMapping = this.getIndustryDecorativeMapping(industry);
    
    const elements: Icon[] = [];
    const elementTypes = ['pattern', 'shape', 'background', 'decoration', 'divider'];
    const usedIcons = new Set<string>();
    
    for (let i = 0; i < 5; i++) {
      const elementType = elementTypes[i];
      const keywords = industryMapping[elementType] || DEFAULT_DECORATIVE_MAPPING[elementType as keyof typeof DEFAULT_DECORATIVE_MAPPING];
      
      let found = false;
      
      for (const keyword of keywords) {
        if (found) break;
        
        const searchResults = await this.searchIconsByKeyword(keyword, styleLibraries, brandStyle);
        
        for (const result of searchResults) {
          const iconKey = result.icon;
          if (!usedIcons.has(iconKey)) {
            usedIcons.add(iconKey);
            
            const svg = await this.getIconSVG(iconKey);
            if (svg) {
              elements.push({
                id: `decorative-${elementType}-${iconKey.replace(':', '-')}`,
                name: this.getDecorativeElementName(elementType),
                svg,
                description: `Декоративный элемент в стиле ${brandStyle}`,
                usage: this.getDecorativeElementUsage(elementType),
                category: elementType as any,
                icon: iconKey,
                libraryRank: result.libraryRank,
                matchScore: result.matchScore
              });
              found = true;
              break;
            }
          }
        }
      }
      
      // Создаем fallback элемент если не найден
      if (!found) {
        elements.push(this.createFallbackDecorativeElement(elementType, brandStyle, i));
      }
    }
    
    return elements;
  }

  // Получение мэппинга декоративных элементов для индустрии
  private getIndustryDecorativeMapping(industry: string): { [key: string]: string[] } {
    const normalizedIndustry = industry.toLowerCase().trim();
    
    // Прямое совпадение
    if (INDUSTRY_DECORATIVE_MAPPING[normalizedIndustry]) {
      return INDUSTRY_DECORATIVE_MAPPING[normalizedIndustry];
    }
    
    // Поиск частичного совпадения
    for (const [industryKey, mapping] of Object.entries(INDUSTRY_DECORATIVE_MAPPING)) {
      if (normalizedIndustry.includes(industryKey) || industryKey.includes(normalizedIndustry)) {
        return mapping;
      }
    }
    
    // Используем универсальный мэппинг
    return DEFAULT_DECORATIVE_MAPPING;
  }

  // Поиск иконок по ключевому слову с улучшенной фильтрацией по стилю
  private async searchIconsByKeyword(
    keyword: string, 
    libraries: { prefix: string; name: string; priority: number }[],
    brandStyle: string
  ): Promise<{ icon: string; name: string; libraryRank: number; matchScore: number }[]> {
    try {
      const url = `${this.baseUrl}/search?query=${encodeURIComponent(keyword)}&limit=50`;
      
      const response = await axios.get(url, { timeout: 10000 });
      const icons = response.data.icons || [];
      
      // Фильтруем и ранжируем результаты
      const filteredIcons = icons
        .filter((icon: string) => {
          const prefix = icon.split(':')[0];
          return libraries.some(lib => lib.prefix === prefix);
        })
        .map((icon: string) => {
          const prefix = icon.split(':')[0];
          const name = icon.split(':')[1];
          const library = libraries.find(lib => lib.prefix === prefix);
          
          // Вычисляем совпадения в названии
          let matchScore = this.calculateMatchScore(name, keyword);
          
          // Бонусы за соответствие стилю
          matchScore += this.calculateStyleBonus(name, brandStyle);
          
          return {
            icon,
            name,
            libraryRank: library?.priority || 99,
            matchScore
          };
        })
        .sort((a, b) => {
          // Сортируем по совпадениям, затем по приоритету библиотеки
          if (a.matchScore !== b.matchScore) {
            return b.matchScore - a.matchScore;
          }
          return a.libraryRank - b.libraryRank;
        })
        .slice(0, 10);
      
      return filteredIcons;
      
    } catch (error) {
      console.error(`Error searching for "${keyword}":`, error);
      return [];
    }
  }

  // Вычисление бонуса за соответствие стилю
  private calculateStyleBonus(iconName: string, brandStyle: string): number {
    const name = iconName.toLowerCase();
    let bonus = 0;
    
    // Бонусы для разных стилей
    switch (brandStyle) {
      case 'Современный':
        if (name.includes('outline') || name.includes('line') || name.includes('minimal')) bonus += 3;
        if (name.includes('filled') || name.includes('solid')) bonus -= 2;
        break;
        
      case 'Классический':
        if (name.includes('filled') || name.includes('solid')) bonus += 3;
        if (name.includes('outline') || name.includes('line')) bonus -= 1;
        break;
        
      case 'Креативный':
        if (name.includes('twotone') || name.includes('duo') || name.includes('color')) bonus += 3;
        if (name.includes('simple') || name.includes('basic')) bonus -= 2;
            break;
        
      case 'Профессиональный':
        if (name.includes('rounded') || name.includes('simple') || name.includes('clean')) bonus += 3;
        if (name.includes('fun') || name.includes('cute')) bonus -= 2;
        break;
        
      case 'Игривый':
        if (name.includes('fun') || name.includes('cute') || name.includes('emoji')) bonus += 3;
        if (name.includes('serious') || name.includes('formal')) bonus -= 2;
        break;
    }
    
    return bonus;
  }

  // Вычисление совпадений в названии иконки
  private calculateMatchScore(iconName: string, keyword: string): number {
    const name = iconName.toLowerCase();
    const key = keyword.toLowerCase();
    
    let score = 0;
    
    // Точное совпадение
    if (name === key) score += 10;
    // Начинается с ключевого слова
    else if (name.startsWith(key)) score += 8;
    // Содержит ключевое слово
    else if (name.includes(key)) score += 6;
    // Совпадения по словам
    else if (name.split(/[-_]/).some(part => part === key)) score += 4;
    // Частичные совпадения
    else if (name.split(/[-_]/).some(part => part.includes(key))) score += 2;
    
    return score;
  }

  // Получение SVG иконки
  private async getIconSVG(iconKey: string): Promise<string | null> {
    try {
      const url = `${this.cdnUrl}/${iconKey}.svg`;
      const response = await axios.get(url, { 
        timeout: 5000,
        responseType: 'text'
      });
      
      // Проверяем, что получили SVG
      if (response.data && response.data.includes('<svg')) {
        return response.data;
      } else {
        return this.createFallbackSVG(iconKey.split(':')[1] || 'icon', 'Профессиональный');
      }
    } catch (error) {
      return this.createFallbackSVG(iconKey.split(':')[1] || 'icon', 'Профессиональный');
    }
  }

  // Создание fallback иконки
  private createFallbackIcon(brandStyle: string, industry: string, index: number): Icon {
    const translatedKeywords = this.translateToEnglish(industry, '');
    const keyword = translatedKeywords[index % translatedKeywords.length] || 'business';
    
    return {
      id: `fallback-brand-icon-${index}`,
      name: this.getIconName(keyword),
      svg: this.createFallbackSVG(keyword, brandStyle),
      description: `Фирменная иконка в стиле ${brandStyle}`,
      usage: 'Использование в брендинге: визитки, лендинги, упаковка, соцсети',
      category: 'icon'
    };
  }

  // Создание fallback декоративного элемента
  private createFallbackDecorativeElement(elementType: string, brandStyle: string, index: number): Icon {
    return {
      id: `fallback-decorative-${elementType}-${index}`,
      name: this.getDecorativeElementName(elementType),
      svg: this.createDecorativeFallbackSVG(elementType, brandStyle),
      description: `Декоративный элемент в стиле ${brandStyle}`,
      usage: this.getDecorativeElementUsage(elementType),
      category: elementType as any
    };
  }

  // Создание fallback SVG
  private createFallbackSVG(keyword: string, style: string): string {
    const styleColors = {
      'Современный': '#2563eb',
      'Классический': '#b91c1c', 
      'Креативный': '#7c3aed',
      'Профессиональный': '#1f2937',
      'Игривый': '#f59e0b'
    };
    
    const color = styleColors[style as keyof typeof styleColors] || '#374151';
    
    return `<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="${color}" opacity="0.1"/>
      <circle cx="32" cy="32" r="20" fill="${color}" opacity="0.2"/>
      <circle cx="32" cy="32" r="12" fill="${color}"/>
      <text x="32" y="36" text-anchor="middle" fill="white" font-size="8" font-weight="bold">${keyword.charAt(0).toUpperCase()}</text>
    </svg>`;
  }

  // Создание fallback SVG для декоративных элементов
  private createDecorativeFallbackSVG(elementType: string, style: string): string {
    const styleColors = {
      'Современный': '#2563eb',
      'Классический': '#b91c1c', 
      'Креативный': '#7c3aed',
      'Профессиональный': '#1f2937',
      'Игривый': '#f59e0b'
    };
    
    const color = styleColors[style as keyof typeof styleColors] || '#374151';
    
    switch (elementType) {
      case 'pattern':
        return `<svg width="120" height="80" viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="pattern-${elementType}" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
              <circle cx="5" cy="5" r="1.5" fill="${color}" opacity="0.3"/>
            </pattern>
          </defs>
          <rect width="120" height="80" fill="url(#pattern-${elementType})"/>
        </svg>`;
      
      case 'shape':
        return `<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
          <polygon points="30,8 35,20 47,20 38,28 41,42 30,36 19,42 22,28 13,20 25,20" fill="${color}"/>
        </svg>`;
      
      case 'background':
        return `<svg width="120" height="80" viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bg-${elementType}" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:${color};stop-opacity:0.1"/>
              <stop offset="100%" style="stop-color:${color};stop-opacity:0.05"/>
            </linearGradient>
          </defs>
          <rect width="120" height="80" fill="url(#bg-${elementType})" rx="8"/>
        </svg>`;
      
      case 'decoration':
        return `<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
          <circle cx="30" cy="30" r="20" fill="none" stroke="${color}" stroke-width="2"/>
          <circle cx="30" cy="30" r="8" fill="${color}"/>
        </svg>`;
      
      case 'divider':
        return `<svg width="120" height="20" viewBox="0 0 120 20" xmlns="http://www.w3.org/2000/svg">
          <line x1="10" y1="10" x2="110" y2="10" stroke="${color}" stroke-width="2"/>
          <circle cx="20" cy="10" r="2" fill="${color}"/>
          <circle cx="100" cy="10" r="2" fill="${color}"/>
        </svg>`;
      
      default:
        return this.createFallbackSVG(elementType, style);
    }
  }

  // Получение названия иконки
  private getIconName(term: string): string {
    const iconNames: { [key: string]: string } = {
      'restaurant': 'Ресторан', 'food': 'Еда', 'chef': 'Повар', 'dining': 'Обед',
      'cafe': 'Кафе', 'coffee': 'Кофе', 'cup': 'Чашка', 'menu': 'Меню',
      'finance': 'Финансы', 'bank': 'Банк', 'money': 'Деньги', 'payment': 'Платеж',
      'technology': 'Технологии', 'code': 'Код', 'computer': 'Компьютер',
      'business': 'Бизнес', 'service': 'Сервис', 'professional': 'Профессионал',
      'health': 'Здоровье', 'medical': 'Медицина', 'education': 'Образование',
      'car': 'Автомобиль', 'transport': 'Транспорт', 'shipping': 'Доставка',
      'shop': 'Магазин', 'store': 'Магазин', 'cart': 'Корзина',
      'beauty': 'Красота', 'salon': 'Салон', 'hair': 'Волосы', 'makeup': 'Макияж'
    };
    
    return iconNames[term] || `${term.charAt(0).toUpperCase()}${term.slice(1)}`;
  }

  // Получение названия декоративного элемента
  private getDecorativeElementName(elementType: string): string {
    const names: { [key: string]: string } = {
      'pattern': 'Фирменный паттерн',
      'shape': 'Декоративная форма',
      'background': 'Фоновый элемент',
      'decoration': 'Декоративный акцент',
      'divider': 'Разделитель'
    };
    return names[elementType] || `Элемент ${elementType}`;
  }

  // Получение описания использования декоративного элемента
  private getDecorativeElementUsage(elementType: string): string {
    const usages: { [key: string]: string } = {
      'pattern': 'Для фоновых текстур в брендбуке, повторяющихся элементов в дизайне',
      'shape': 'Для акцентирования заголовков и важных блоков информации',
      'background': 'Для создания фоновых композиций и подложек в материалах',
      'decoration': 'Для декоративного оформления и визуальных акцентов',
      'divider': 'Для разделения секций контента и создания структуры'
    };
    return usages[elementType] || 'Для использования в брендинге и дизайне материалов';
  }

  // Создание fallback наборов
  private createFallbackIconsAndElements(brandStyle: string, industry: string): Icon[] {
    const icons: Icon[] = [];
    
    // 5 фирменных иконок
    for (let i = 0; i < 5; i++) {
      icons.push(this.createFallbackIcon(brandStyle, industry, i));
    }
    
    // 5 декоративных элементов
    const elementTypes = ['pattern', 'shape', 'background', 'decoration', 'divider'];
    for (let i = 0; i < 5; i++) {
      icons.push(this.createFallbackDecorativeElement(elementTypes[i], brandStyle, i));
    }
    
    return icons;
  }
}

// Экспорт единственного экземпляра сервиса
export const iconService = new IconService(); 