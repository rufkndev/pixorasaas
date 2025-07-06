// Интерфейсы для рекомендаций
export interface FontGuideline {
  fontFamily: string;
  purpose: 'primary' | 'secondary' | 'accent';
  title: string;
  description: string;
  usage: string;
  recommendedSizes: string[];
  prohibitions: string[];
  examples: {
    correct: string;
    incorrect: string;
  };
}

export interface ColorGuideline {
  colorName: string;
  hex: string;
  rgb: string;
  role: 'primary' | 'secondary' | 'accent' | 'neutral' | 'background';
  description: string;
  usage: string;
  combinations: string[];
  prohibitions: string[];
  accessibility: {
    contrast: string;
    wcag: string;
  };
}

export interface LogoGuideline {
  variant: string;
  minSize: string;
  clearSpace: string;
  placement: string[];
  allowedBackgrounds: string[];
  prohibitions: string[];
  examples: {
    correct: string[];
    incorrect: string[];
  };
}

export interface IconGuideline {
  style: string;
  usage: string[];
  contexts: string[];
  prohibitions: string[];
  colorRules: string[];
}

export interface ToneOfVoice {
  personality: string[];
  style: 'formal' | 'friendly' | 'professional' | 'casual' | 'authoritative';
  characteristics: string[];
  doList: string[];
  dontList: string[];
  examples: {
    correct: string[];
    incorrect: string[];
  };
}

export interface BrandGuidelines {
  fonts: FontGuideline[];
  colors: ColorGuideline[];
  logo: LogoGuideline[];
  icons: IconGuideline;
  toneOfVoice: ToneOfVoice;
}

// Сервис для генерации рекомендаций
export class GuidelinesService {
  
  // Генерация рекомендаций для шрифтов
  private generateFontGuidelines(fonts: any[], keywords: string): FontGuideline[] {
    const guidelines: FontGuideline[] = [];
    
    fonts.forEach((font, index) => {
      const isPrimary = index === 0;
      const isSecondary = index === 1;
      
      const guideline: FontGuideline = {
        fontFamily: font.name,
        purpose: isPrimary ? 'primary' : isSecondary ? 'secondary' : 'accent',
        title: isPrimary ? 'Основной шрифт' : isSecondary ? 'Вспомогательный шрифт' : 'Акцентный шрифт',
        description: isPrimary 
          ? 'Используется для заголовков, логотипов и акцентных элементов'
          : isSecondary 
            ? 'Используется для основного текста, подзаголовков и описаний'
            : 'Используется для специальных элементов и декоративных надписей',
        usage: isPrimary
          ? 'Заголовки H1-H3, кнопки, навигация, логотип'
          : isSecondary
            ? 'Основной текст, подзаголовки H4-H6, описания, сноски'
            : 'Специальные элементы, цитаты, акценты',
        recommendedSizes: isPrimary
          ? ['32px-48px для заголовков', '24px-32px для подзаголовков', '16px-20px для кнопок']
          : isSecondary
            ? ['16px-18px для основного текста', '14px-16px для вспомогательного', '12px-14px для сносок']
            : ['18px-24px для акцентов', '14px-18px для цитат'],
        prohibitions: [
          'Не используйте более двух разных шрифтов одновременно',
          'Не растягивайте и не сжимайте шрифт',
          'Не используйте слишком маленький размер (менее 12px)',
          'Не смешивайте с другими декоративными шрифтами'
        ],
        examples: {
          correct: isPrimary ? 'Заголовок страницы, название компании' : 'Абзац текста, описание услуги',
          incorrect: isPrimary ? 'Основной текст статьи, мелкие подписи' : 'Крупные заголовки, логотип'
        }
      };
      
      guidelines.push(guideline);
    });
    
    return guidelines;
  }
  
  // Генерация рекомендаций для цветов
  private generateColorGuidelines(colors: any[], keywords: string): ColorGuideline[] {
    const guidelines: ColorGuideline[] = [];
    
    colors.forEach((color, index) => {
      const role = index === 0 ? 'primary' : index === 1 ? 'secondary' : index < 4 ? 'accent' : 'neutral';
      
      const guideline: ColorGuideline = {
        colorName: color.name,
        hex: color.hex,
        rgb: color.rgb,
        role: role,
        description: this.getColorDescription(role, color.name),
        usage: this.getColorUsage(role),
        combinations: this.getColorCombinations(color.hex, colors),
        prohibitions: this.getColorProhibitions(role),
        accessibility: {
          contrast: this.calculateContrastRatio(color.hex),
          wcag: this.getWCAGCompliance(color.hex)
        }
      };
      
      guidelines.push(guideline);
    });
    
    return guidelines;
  }
  
  // Генерация рекомендаций для логотипа
  private generateLogoGuidelines(logoVariants: any[], businessName: string): LogoGuideline[] {
    const guidelines: LogoGuideline[] = [];
    
    logoVariants.forEach(variant => {
      const guideline: LogoGuideline = {
        variant: variant.name,
        minSize: variant.type === 'favicon' ? '16px' : variant.type === 'horizontal' ? '120px' : '80px',
        clearSpace: 'Равное высоте логотипа с каждой стороны',
        placement: this.getLogoPlacement(variant.type),
        allowedBackgrounds: this.getAllowedBackgrounds(variant.type),
        prohibitions: [
          'Не растягивайте логотип',
          'Не обрезайте части логотипа',
          'Не добавляйте тени или эффекты',
          'Не поворачивайте логотип',
          'Не изменяйте цвета без разрешения',
          'Не размещайте на пестрых фонах'
        ],
        examples: {
          correct: [
            'Размещение в левом верхнем углу сайта',
            'Использование на белом или нейтральном фоне',
            'Соблюдение минимального размера'
          ],
          incorrect: [
            'Растягивание логотипа для заполнения пространства',
            'Размещение на фотографии без подложки',
            'Использование слишком маленького размера'
          ]
        }
      };
      
      guidelines.push(guideline);
    });
    
    return guidelines;
  }
  
  // Генерация рекомендаций для иконок
  private generateIconGuidelines(icons: any[], keywords: string): IconGuideline {
    const styles = [...new Set(icons.map(icon => icon.category))];
    
    return {
      style: 'Минималистичный, линейный стиль с едиными пропорциями',
      usage: [
        'Навигация и меню',
        'Кнопки и интерактивные элементы',
        'Информационные блоки',
        'Социальные сети',
        'Контакты и связь'
      ],
      contexts: [
        'Веб-сайт и интерфейсы',
        'Мобильные приложения',
        'Презентации и документы',
        'Социальные сети',
        'Рекламные материалы'
      ],
      prohibitions: [
        'Не смешивайте разные стили иконок',
        'Не используйте иконки вне фирменной палитры',
        'Не изменяйте пропорции иконок',
        'Не добавляйте лишние детали',
        'Не используйте слишком мелкий размер (менее 16px)'
      ],
      colorRules: [
        'Используйте основные цвета бренда',
        'Для состояний используйте нейтральные цвета',
        'Активные элементы - акцентные цвета',
        'Неактивные элементы - серый цвет'
      ]
    };
  }
  
  // Генерация тона и голоса бренда
  private generateToneOfVoice(keywords: string, businessName: string): ToneOfVoice {
    const keywordList = keywords.toLowerCase().split(/[,\s]+/);
    
    // Определяем стиль на основе ключевых слов
    let style: 'formal' | 'friendly' | 'professional' | 'casual' | 'authoritative' = 'professional';
    
    if (keywordList.some(word => ['дружелюбный', 'простой', 'доступный', 'семейный'].includes(word))) {
      style = 'friendly';
    } else if (keywordList.some(word => ['строгий', 'деловой', 'корпоративный', 'официальный'].includes(word))) {
      style = 'formal';
    } else if (keywordList.some(word => ['молодежный', 'современный', 'креативный', 'неформальный'].includes(word))) {
      style = 'casual';
    } else if (keywordList.some(word => ['экспертный', 'лидерский', 'авторитетный', 'надежный'].includes(word))) {
      style = 'authoritative';
    }
    
    return {
      personality: this.getPersonalityTraits(style, keywordList),
      style: style,
      characteristics: this.getStyleCharacteristics(style),
      doList: this.getDoList(style),
      dontList: this.getDontList(style),
      examples: {
        correct: this.getCorrectExamples(style, businessName),
        incorrect: this.getIncorrectExamples(style, businessName)
      }
    };
  }
  
  // Основная функция генерации рекомендаций
  async generateGuidelines(brandbook: any, keywords: string): Promise<BrandGuidelines> {
    try {
      console.log('Generating brand guidelines for:', brandbook.businessName);
      
      const fontGuidelines = this.generateFontGuidelines(brandbook.fonts || [], keywords);
      const colorGuidelines = this.generateColorGuidelines(brandbook.colors || [], keywords);
      const logoGuidelines = this.generateLogoGuidelines(brandbook.logoVariants || [], brandbook.businessName);
      const iconGuidelines = this.generateIconGuidelines(brandbook.icons || [], keywords);
      const toneOfVoice = this.generateToneOfVoice(keywords, brandbook.businessName);
      
      const guidelines: BrandGuidelines = {
        fonts: fontGuidelines,
        colors: colorGuidelines,
        logo: logoGuidelines,
        icons: iconGuidelines,
        toneOfVoice: toneOfVoice
      };
      
      console.log('Brand guidelines generated successfully');
      return guidelines;
      
    } catch (error) {
      console.error('Error generating brand guidelines:', error);
      throw error;
    }
  }
  
  // Вспомогательные методы
  private getColorDescription(role: string, colorName: string): string {
    switch (role) {
      case 'primary': return `Основной цвет бренда. Используется для ключевых элементов и акцентов.`;
      case 'secondary': return `Вспомогательный цвет. Дополняет основной и создает гармоничные сочетания.`;
      case 'accent': return `Акцентный цвет. Используется для привлечения внимания и создания контраста.`;
      case 'neutral': return `Нейтральный цвет. Используется для фонов, текста и вспомогательных элементов.`;
      default: return `Дополнительный цвет палитры.`;
    }
  }
  
  private getColorUsage(role: string): string {
    switch (role) {
      case 'primary': return 'Логотип, заголовки, кнопки, ссылки, основные акценты';
      case 'secondary': return 'Подзаголовки, границы, иконки, вспомогательные элементы';
      case 'accent': return 'Призывы к действию, уведомления, выделения, специальные элементы';
      case 'neutral': return 'Фоны, текст, рамки, разделители';
      default: return 'Дополнительные элементы и акценты';
    }
  }
  
  private getColorCombinations(hex: string, colors: any[]): string[] {
    // Простая логика для рекомендации сочетаний
    const combinations: string[] = [];
    colors.forEach(color => {
      if (color.hex !== hex) {
        combinations.push(`${hex} + ${color.hex}`);
      }
    });
    return combinations.slice(0, 3);
  }
  
  private getColorProhibitions(role: string): string[] {
    const common = [
      'Не используйте на похожих по тону фонах',
      'Не смешивайте с неконтрастными цветами для текста'
    ];
    
    switch (role) {
      case 'primary':
        return [...common, 'Не используйте как цвет основного текста', 'Не разбавляйте слишком светлыми оттенками'];
      case 'secondary':
        return [...common, 'Не используйте как единственный акцентный цвет'];
      default:
        return common;
    }
  }
  
  private calculateContrastRatio(hex: string): string {
    // Упрощенная логика расчета контрастности
    const rgb = this.hexToRgb(hex);
    if (!rgb) return 'Средний';
    
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance > 0.5 ? 'Высокий с темным текстом' : 'Высокий со светлым текстом';
  }
  
  private getWCAGCompliance(hex: string): string {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return 'AA';
    
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance > 0.3 && luminance < 0.7 ? 'AAA' : 'AA';
  }
  
  private hexToRgb(hex: string): {r: number, g: number, b: number} | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
  
  private getLogoPlacement(type: string): string[] {
    switch (type) {
      case 'horizontal':
        return ['Верхняя часть документов', 'Подвал сайта', 'Горизонтальные баннеры'];
      case 'vertical':
        return ['Боковые панели', 'Вертикальные баннеры', 'Мобильные интерфейсы'];
      case 'favicon':
        return ['Иконка сайта', 'Социальные сети', 'Приложения'];
      case 'monochrome':
        return ['Печатные материалы', 'Штампы', 'Гравировка'];
      default:
        return ['Универсальное использование'];
    }
  }
  
  private getAllowedBackgrounds(type: string): string[] {
    switch (type) {
      case 'inverted':
        return ['Темные фоны', 'Цветные фоны', 'Фотографии'];
      case 'monochrome':
        return ['Любые фоны', 'Печатные материалы'];
      default:
        return ['Белый фон', 'Светлые фоны', 'Нейтральные цвета'];
    }
  }
  
  private getPersonalityTraits(style: string, keywords: string[]): string[] {
    const traits: Record<string, string[]> = {
      formal: ['Профессиональный', 'Надежный', 'Авторитетный', 'Строгий'],
      friendly: ['Дружелюбный', 'Открытый', 'Теплый', 'Приветливый'],
      professional: ['Компетентный', 'Уверенный', 'Качественный', 'Экспертный'],
      casual: ['Неформальный', 'Современный', 'Креативный', 'Гибкий'],
      authoritative: ['Лидерский', 'Влиятельный', 'Респектабельный', 'Статусный']
    };
    
    return traits[style] || traits.professional;
  }
  
  private getStyleCharacteristics(style: string): string[] {
    const characteristics: Record<string, string[]> = {
      formal: ['Четкие формулировки', 'Официальная лексика', 'Полные предложения', 'Избегание сокращений'],
      friendly: ['Простые слова', 'Личные обращения', 'Эмоциональность', 'Разговорные выражения'],
      professional: ['Точность', 'Ясность', 'Компетентность', 'Умеренная формальность'],
      casual: ['Современные выражения', 'Краткость', 'Живость', 'Неформальность'],
      authoritative: ['Уверенность', 'Экспертность', 'Конкретность', 'Лидерство']
    };
    
    return characteristics[style] || characteristics.professional;
  }
  
  private getDoList(style: string): string[] {
    const doLists: Record<string, string[]> = {
      formal: ['Используйте полные предложения', 'Проверяйте грамматику', 'Будьте конкретными', 'Соблюдайте этикет'],
      friendly: ['Обращайтесь к людям лично', 'Используйте простые слова', 'Будьте искренними', 'Показывайте эмпатию'],
      professional: ['Будьте точными', 'Предоставляйте факты', 'Используйте профессиональную лексику', 'Структурируйте информацию'],
      casual: ['Будьте естественными', 'Используйте современные выражения', 'Будьте краткими', 'Показывайте личность'],
      authoritative: ['Говорите с уверенностью', 'Предоставляйте доказательства', 'Будьте конкретными', 'Показывайте экспертизу']
    };
    
    return doLists[style] || doLists.professional;
  }
  
  private getDontList(style: string): string[] {
    const dontLists: Record<string, string[]> = {
      formal: ['Избегайте жаргона', 'Не используйте сокращения', 'Не будьте слишком личными', 'Не нарушайте этикет'],
      friendly: ['Не будьте слишком официальными', 'Не используйте сложные термины', 'Не будьте холодными', 'Не игнорируйте эмоции'],
      professional: ['Не будьте слишком формальными', 'Не используйте жаргон', 'Не будьте неточными', 'Не теряйте фокус'],
      casual: ['Не будьте слишком формальными', 'Не используйте устаревшие выражения', 'Не будьте скучными', 'Не переусложняйте'],
      authoritative: ['Не будьте неуверенными', 'Не используйте слабые выражения', 'Не будьте неточными', 'Не теряйте авторитет']
    };
    
    return dontLists[style] || dontLists.professional;
  }
  
  private getCorrectExamples(style: string, businessName: string): string[] {
    const examples: Record<string, string[]> = {
      formal: [
        `Компания "${businessName}" предоставляет высококачественные услуги.`,
        `Мы благодарим Вас за выбор нашей компании.`,
        `Обращаем Ваше внимание на новые возможности.`
      ],
      friendly: [
        `Привет! Мы рады видеть тебя в ${businessName}!`,
        `Давайте вместе создадим что-то удивительное.`,
        `Спасибо, что выбрали нас. Мы очень ценим это!`
      ],
      professional: [
        `${businessName} - ваш надежный партнер в бизнесе.`,
        `Мы помогаем компаниям достигать целей.`,
        `Наша экспертиза к вашим услугам.`
      ],
      casual: [
        `${businessName} делает жизнь проще.`,
        `Мы знаем, как это сделать круто.`,
        `Присоединяйся к нам!`
      ],
      authoritative: [
        `${businessName} - лидер в своей области.`,
        `Мы устанавливаем стандарты качества.`,
        `Доверьтесь нашему опыту.`
      ]
    };
    
    return examples[style] || examples.professional;
  }
  
  private getIncorrectExamples(style: string, businessName: string): string[] {
    const examples: Record<string, string[]> = {
      formal: [
        `Хай! Мы супер крутые ребята из ${businessName}!`,
        `Йоу, заходи к нам, будет весело!`,
        `Мы типа самые лучшие, не?`
      ],
      friendly: [
        `Уважаемые господа! Имеем честь довести до Вашего сведения...`,
        `Компания "${businessName}" в строгом соответствии с требованиями...`,
        `Настоящим уведомляем о нижеследующем...`
      ],
      professional: [
        `Мы самые крутые в мире!`,
        `Все остальные - отстой.`,
        `Йоу, чувак, мы зажигаем!`
      ],
      casual: [
        `Согласно уставу компании "${businessName}"...`,
        `В соответствии с регламентом...`,
        `Довожу до Вашего сведения...`
      ],
      authoritative: [
        `Мы не очень уверены, но думаем, что...`,
        `Возможно, мы могли бы попробовать...`,
        `Мы надеемся, что все получится...`
      ]
    };
    
    return examples[style] || examples.professional;
  }
}

// Экспорт сингл-тона
export const guidelinesService = new GuidelinesService(); 