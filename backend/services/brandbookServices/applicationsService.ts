// Интерфейсы для примеров применения
export interface BusinessCard {
  layout: 'horizontal' | 'vertical';
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  logoPlacement: string;
  fontPrimary: string;
  fontSecondary: string;
  elements: {
    logo: boolean;
    name: boolean;
    title: boolean;
    contact: boolean;
    website: boolean;
  };
  template: string;
}

export interface Presentation {
  coverTemplate: string;
  slideTemplate: string;
  colorScheme: {
    background: string;
    primary: string;
    secondary: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  logoUsage: string;
  guidelines: string[];
}

export interface SocialMedia {
  platforms: ('instagram' | 'facebook' | 'twitter' | 'linkedin' | 'youtube')[];
  templates: {
    post: string;
    story: string;
    cover: string;
  };
  colorGuidelines: string[];
  fontGuidelines: string[];
  logoGuidelines: string[];
  contentGuidelines: string[];
}

export interface EmailSignature {
  layout: string;
  elements: {
    name: string;
    title: string;
    company: string;
    contact: string;
    logo: string;
  };
  colors: {
    primary: string;
    secondary: string;
    text: string;
  };
  fonts: {
    primary: string;
    secondary: string;
  };
  template: string;
}

export interface WebsiteLanding {
  sections: {
    header: {
      layout: string;
      navigation: string;
      logoPlacement: string;
      colors: string;
    };
    hero: {
      layout: string;
      ctaButton: string;
      backgroundType: string;
      colors: string;
    };
    content: {
      layout: string;
      iconUsage: string;
      colors: string;
      typography: string;
    };
    footer: {
      layout: string;
      logoUsage: string;
      colors: string;
    };
  };
  colorScheme: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
  typography: {
    headings: string;
    body: string;
    buttons: string;
  };
}

export interface BrandApplications {
  businessCard: BusinessCard;
  presentation: Presentation;
  socialMedia: SocialMedia;
  emailSignature: EmailSignature;
  websiteLanding: WebsiteLanding;
}

// Сервис для генерации примеров применения
export class ApplicationsService {
  
  // Генерация макета визитки
  private generateBusinessCard(colors: any[], fonts: any[], logoUrl: string, businessName: string): BusinessCard {
    const primaryColor = colors[0]?.hex || '#000000';
    const secondaryColor = colors[1]?.hex || '#666666';
    const textColor = colors.find(c => c.role === 'neutral')?.hex || '#333333';
    
    return {
      layout: 'horizontal',
      primaryColor,
      secondaryColor,
      textColor,
      logoPlacement: 'top-right',
      fontPrimary: fonts[0]?.name || 'Arial',
      fontSecondary: fonts[1]?.name || 'Arial',
      elements: {
        logo: true,
        name: true,
        title: true,
        contact: true,
        website: true
      },
      template: this.generateBusinessCardTemplate(primaryColor, secondaryColor, textColor, fonts, businessName, logoUrl)
    };
  }
  
  // Генерация шаблона презентации
  private generatePresentation(colors: any[], fonts: any[], logoUrl: string, businessName: string): Presentation {
    const background = colors.find(c => c.role === 'background')?.hex || '#ffffff';
    const primary = colors[0]?.hex || '#000000';
    const secondary = colors[1]?.hex || '#666666';
    const text = colors.find(c => c.role === 'neutral')?.hex || '#333333';
    
    return {
      coverTemplate: this.generateCoverTemplate(primary, secondary, background, businessName),
      slideTemplate: this.generateSlideTemplate(primary, secondary, background, text),
      colorScheme: {
        background,
        primary,
        secondary,
        text
      },
      fonts: {
        heading: fonts[0]?.name || 'Arial',
        body: fonts[1]?.name || 'Arial'
      },
      logoUsage: 'Размещайте логотип в правом верхнем углу каждого слайда',
      guidelines: [
        'Используйте не более 2-3 цветов на слайде',
        'Заголовки - основным шрифтом, текст - вспомогательным',
        'Соблюдайте единый стиль для всех слайдов',
        'Логотип должен быть виден, но не доминировать'
      ]
    };
  }
  
  // Генерация рекомендаций для социальных сетей
  private generateSocialMedia(colors: any[], fonts: any[], icons: any[], businessName: string, logoUrl?: string): SocialMedia {
    return {
      platforms: ['instagram', 'facebook', 'twitter', 'linkedin'],
      templates: {
        post: this.generateSocialPostTemplate(colors, fonts, businessName, logoUrl),
        story: this.generateSocialStoryTemplate(colors, fonts, businessName, logoUrl),
        cover: this.generateSocialCoverTemplate(colors, fonts, businessName, logoUrl)
      },
      colorGuidelines: [
        `Основной цвет: ${colors[0]?.hex || '#000000'} - для заголовков и акцентов`,
        `Вспомогательный цвет: ${colors[1]?.hex || '#666666'} - для подзаголовков`,
        `Фоновый цвет: ${colors.find(c => c.role === 'background')?.hex || '#ffffff'} - для основного фона`,
        'Не используйте более 3 цветов в одном посте'
      ],
      fontGuidelines: [
        `Заголовки: ${fonts[0]?.name || 'Arial'} - для привлечения внимания`,
        `Основной текст: ${fonts[1]?.name || 'Arial'} - для читабельности`,
        'Размер шрифта: не менее 16px для мобильных устройств'
      ],
      logoGuidelines: [
        'Размещайте логотип в углу изображения для создания брендинга',
        'Используйте белый фон для логотипа на ярких изображениях',
        'Минимальный размер: 50x50px для хорошей видимости',
        'Добавляйте тени для лучшего контраста с фоном',
        'Используйте круглую рамку для Stories'
      ],
      contentGuidelines: [
        'Используйте фирменные иконки для Stories',
        'Поддерживайте единый визуальный стиль',
        'Соблюдайте тон бренда в текстах',
        'Используйте фирменные цвета для выделений',
        'Добавляйте градиенты и эффекты для современного вида'
      ]
    };
  }
  
  // Генерация подписи для email
  private generateEmailSignature(colors: any[], fonts: any[], logoUrl: string, businessName: string): EmailSignature {
    const primary = colors[0]?.hex || '#000000';
    const secondary = colors[1]?.hex || '#666666';
    const text = colors.find(c => c.role === 'neutral')?.hex || '#333333';
    
    return {
      layout: 'horizontal',
      elements: {
        name: 'Имя Фамилия',
        title: 'Должность',
        company: businessName,
        contact: 'email@company.com | +7 (xxx) xxx-xx-xx',
        logo: logoUrl
      },
      colors: {
        primary,
        secondary,
        text
      },
      fonts: {
        primary: fonts[0]?.name || 'Arial',
        secondary: fonts[1]?.name || 'Arial'
      },
      template: this.generateEmailSignatureTemplate(colors, fonts, businessName, logoUrl)
    };
  }
  
  // Генерация рекомендаций для сайта
  private generateWebsiteLanding(colors: any[], fonts: any[], icons: any[], businessName: string): WebsiteLanding {
    const primary = colors[0]?.hex || '#000000';
    const secondary = colors[1]?.hex || '#666666';
    const background = colors.find(c => c.role === 'background')?.hex || '#ffffff';
    const text = colors.find(c => c.role === 'neutral')?.hex || '#333333';
    
    return {
      sections: {
        header: {
          layout: 'horizontal',
          navigation: 'горизонтальное меню справа',
          logoPlacement: 'слева',
          colors: `фон: ${background}, логотип: ${primary}, меню: ${text}`
        },
        hero: {
          layout: 'центрированный',
          ctaButton: `цвет: ${primary}, текст: белый`,
          backgroundType: 'градиент или изображение',
          colors: `заголовок: ${primary}, подзаголовок: ${secondary}, кнопка: ${primary}`
        },
        content: {
          layout: 'сетка или колонки',
          iconUsage: 'фирменные иконки для разделов',
          colors: `заголовки: ${primary}, текст: ${text}, акценты: ${secondary}`,
          typography: `заголовки: ${fonts[0]?.name || 'Arial'}, текст: ${fonts[1]?.name || 'Arial'}`
        },
        footer: {
          layout: 'многоколоночный',
          logoUsage: 'монохромная версия',
          colors: `фон: ${secondary}, текст: светлый, логотип: белый`
        }
      },
      colorScheme: {
        primary,
        secondary,
        background,
        text
      },
      typography: {
        headings: fonts[0]?.name || 'Arial',
        body: fonts[1]?.name || 'Arial',
        buttons: fonts[0]?.name || 'Arial'
      }
    };
  }
  
  // Основная функция генерации примеров применения
  async generateApplications(brandbook: any): Promise<BrandApplications> {
    try {
      console.log('Generating brand applications for:', brandbook.businessName);
      
      const businessCard = this.generateBusinessCard(
        brandbook.colors || [],
        brandbook.fonts || [],
        brandbook.originalLogoUrl || '',
        brandbook.businessName
      );
      
      const presentation = this.generatePresentation(
        brandbook.colors || [],
        brandbook.fonts || [],
        brandbook.originalLogoUrl || '',
        brandbook.businessName
      );
      
      const socialMedia = this.generateSocialMedia(
        brandbook.colors || [],
        brandbook.fonts || [],
        brandbook.icons || [],
        brandbook.businessName,
        brandbook.originalLogoUrl || ''
      );
      
      const emailSignature = this.generateEmailSignature(
        brandbook.colors || [],
        brandbook.fonts || [],
        brandbook.originalLogoUrl || '',
        brandbook.businessName
      );
      
      const websiteLanding = this.generateWebsiteLanding(
        brandbook.colors || [],
        brandbook.fonts || [],
        brandbook.icons || [],
        brandbook.businessName
      );
      
      const applications: BrandApplications = {
        businessCard,
        presentation,
        socialMedia,
        emailSignature,
        websiteLanding
      };
      
      console.log('Brand applications generated successfully');
      return applications;
      
    } catch (error) {
      console.error('Error generating brand applications:', error);
      throw error;
    }
  }
  
  // Вспомогательные методы для генерации шаблонов
  private generateBusinessCardTemplate(primary: string, secondary: string, text: string, fonts: any[], businessName: string, logoUrl?: string): string {
    return `
      <div style="width: 100%; height: 200px; background: linear-gradient(135deg, #ffffff 0%, ${primary}05 100%); border-radius: 8px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; padding: 20px; box-sizing: border-box;">
        <div style="position: absolute; top: -10px; right: -10px; width: 60px; height: 60px; background: linear-gradient(45deg, ${primary}10, ${primary}20); border-radius: 50%; opacity: 0.6;"></div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; position: relative; z-index: 1;">
          <div style="flex: 1; margin-right: 15px;">
            <h3 style="color: ${primary}; font-size: 18px; margin: 0 0 5px 0; font-weight: 700; font-family: ${fonts[0]?.name || 'Arial'}, sans-serif; line-height: 1.2;">${businessName}</h3>
            <div style="height: 2px; width: 30px; background: ${primary}; margin: 0 0 12px 0; border-radius: 1px;"></div>
          </div>
          <div style="width: 45px; height: 45px; background: ${logoUrl ? '#ffffff' : primary}; border: 1px solid ${primary}; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); flex-shrink: 0;">
            <span style="color: ${logoUrl ? primary : '#ffffff'}; font-weight: bold; font-size: 8px; text-align: center;">LOGO</span>
          </div>
        </div>
        <div style="position: relative; z-index: 1;">
          <p style="color: ${text}; font-size: 14px; margin: 0 0 4px 0; font-family: ${fonts[1]?.name || 'Arial'}, sans-serif; font-weight: 600; line-height: 1.3;">Имя Фамилия</p>
          <p style="color: ${secondary}; font-size: 12px; margin: 0 0 12px 0; font-family: ${fonts[1]?.name || 'Arial'}, sans-serif; opacity: 0.8; line-height: 1.3;">Должность в компании</p>
          <div style="display: flex; flex-wrap: wrap; gap: 4px; font-size: 10px; font-family: ${fonts[1]?.name || 'Arial'}, sans-serif;">
            <div style="display: flex; align-items: center; background: ${primary}08; padding: 3px 6px; border-radius: 10px; color: ${primary};">
              <span style="margin-right: 3px;">📞</span>
              <span>+7 (xxx) xxx-xx-xx</span>
            </div>
            <div style="display: flex; align-items: center; background: ${primary}08; padding: 3px 6px; border-radius: 10px; color: ${primary};">
              <span style="margin-right: 3px;">✉</span>
              <span>email@company.com</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  private generateCoverTemplate(primary: string, secondary: string, background: string, businessName: string): string {
    return `
      <div style="width: 100%; height: 400px; background: linear-gradient(135deg, ${background} 0%, ${primary}08 50%, ${secondary}05 100%); border-radius: 8px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 40px; box-sizing: border-box;">
        <div style="position: absolute; top: -50px; right: -50px; width: 150px; height: 150px; background: linear-gradient(45deg, ${primary}15, ${primary}25); border-radius: 50%; opacity: 0.6;"></div>
        <div style="position: absolute; bottom: -60px; left: -60px; width: 160px; height: 160px; background: linear-gradient(45deg, ${secondary}10, ${secondary}20); border-radius: 50%; opacity: 0.4;"></div>
        <div style="position: relative; z-index: 2; background: rgba(255,255,255,0.05); padding: 36px 28px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(1px); max-width: 100%;">
          <div style="width: 48px; height: 2px; background: ${primary}; margin: 0 auto 28px auto; border-radius: 1px;"></div>
          <h1 style="color: ${primary}; font-size: 32px; margin: 0 0 12px 0; font-weight: 800; letter-spacing: -0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.1); line-height: 1.1;">Презентация</h1>
          <h2 style="color: ${secondary}; font-size: 20px; margin: 0 0 28px 0; font-weight: 300; opacity: 0.9; letter-spacing: -0.3px; line-height: 1.2;">${businessName}</h2>
          <div style="width: 44px; height: 44px; background: ${primary}; margin: 0 auto; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            <span style="color: white; font-size: 16px; margin-left: 2px;">▶</span>
          </div>
        </div>
      </div>
    `;
  }
  
  private generateSlideTemplate(primary: string, secondary: string, background: string, text: string): string {
    return `
      <div style="width: 100%; height: 400px; background: linear-gradient(135deg, ${background} 0%, ${primary}03 100%); border-radius: 8px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); padding: 32px; color: ${text}; position: relative; display: flex; flex-direction: column; box-sizing: border-box;">
        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 3px; background: linear-gradient(90deg, ${primary} 0%, ${secondary} 100%); border-radius: 8px 8px 0 0;"></div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
          <div style="flex: 1; padding-right: 20px;">
            <h1 style="color: ${primary}; font-size: 24px; margin: 0 0 8px 0; font-weight: 700; letter-spacing: -0.5px; line-height: 1.2;">Заголовок слайда</h1>
            <div style="width: 40px; height: 2px; background: ${primary}; border-radius: 1px;"></div>
          </div>
          <div style="width: 52px; height: 52px; background: ${primary}; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: bold; box-shadow: 0 2px 8px rgba(0,0,0,0.1); flex-shrink: 0;">
            LOGO
          </div>
        </div>
        <div style="display: flex; gap: 24px; align-items: stretch; flex: 1;">
          <div style="flex: 1; display: flex; flex-direction: column;">
            <h2 style="color: ${secondary}; font-size: 16px; margin: 0 0 16px 0; font-weight: 600; line-height: 1.3;">Подзаголовок</h2>
            <p style="font-size: 14px; line-height: 1.4; margin: 0 0 20px 0; opacity: 0.9; flex-grow: 1;">Основной текст презентации. Здесь размещается детальное содержимое слайда.</p>
            <div style="space-y: 10px;">
              <div style="display: flex; gap: 8px; margin-bottom: 10px;">
                <div style="width: 4px; height: 4px; background: ${primary}; border-radius: 50%; margin-top: 8px; flex-shrink: 0;"></div>
                <div style="flex: 1;">
                  <p style="font-size: 12px; margin: 0; opacity: 0.8; line-height: 1.4;">Ключевой пункт 1</p>
                </div>
              </div>
              <div style="display: flex; gap: 8px;">
                <div style="width: 4px; height: 4px; background: ${primary}; border-radius: 50%; margin-top: 8px; flex-shrink: 0;"></div>
                <div style="flex: 1;">
                  <p style="font-size: 12px; margin: 0; opacity: 0.8; line-height: 1.4;">Ключевой пункт 2</p>
                </div>
              </div>
            </div>
          </div>
          <div style="flex: 1; display: flex; align-items: center; justify-content: center; padding-left: 12px;">
            <div style="width: 100%; height: 160px; background: linear-gradient(135deg, ${primary}05, ${secondary}03); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: ${secondary}; font-size: 12px; font-weight: 500; border: 1px dashed ${primary}40;">
              <div style="text-align: center;">
                <div style="width: 40px; height: 40px; background: ${primary}15; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto;">
                  <span style="font-size: 16px; color: ${primary};">📊</span>
                </div>
                <p style="margin: 0; opacity: 0.7; font-size: 11px;">Изображение или график</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  private generateSocialPostTemplate(colors: any[], fonts: any[], businessName: string, logoUrl?: string): string {
    const primary = colors[0]?.hex || '#000000';
    const secondary = colors[1]?.hex || '#666666';
    const background = colors.find(c => c.role === 'background')?.hex || '#ffffff';
    
    return `
      <div style="width: 100%; max-width: 448px; height: 300px; background: linear-gradient(135deg, ${background} 0%, ${primary}08 50%, ${secondary}05 100%); border-radius: 8px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); padding: 18px; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden; box-sizing: border-box; margin: 0 auto;">
        <div style="position: absolute; top: 8px; right: 8px; width: 40px; height: 40px; background: linear-gradient(45deg, ${primary}10, ${primary}20); border-radius: 50%; opacity: 0.5;"></div>
        <div style="position: relative; z-index: 2;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <div style="width: 34px; height: 34px; background: ${logoUrl ? '#ffffff' : primary}; border: 1px solid ${primary}; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <span style="color: ${logoUrl ? primary : '#ffffff'}; font-weight: bold; font-size: 8px; text-align: center;">LOGO</span>
            </div>
            <div style="font-size: 12px; color: ${secondary}; font-weight: 500; opacity: 0.8;">${businessName}</div>
          </div>
          <div style="background: rgba(255,255,255,0.9); padding: 16px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.3);">
            <h2 style="color: ${primary}; font-size: 16px; margin: 0 0 8px 0; font-weight: 700; font-family: ${fonts[0]?.name || 'Arial'}, sans-serif; line-height: 1.3;">Заголовок поста</h2>
            <p style="color: #555; font-size: 12px; line-height: 1.4; margin: 0; font-family: ${fonts[1]?.name || 'Arial'}, sans-serif; opacity: 0.9;">Увлекательное описание или основной текст поста для социальных сетей</p>
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px; position: relative; z-index: 2;">
          <div style="display: flex; gap: 8px;">
            <div style="width: 28px; height: 28px; background: ${primary}20; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <span style="color: ${primary}; font-size: 12px;">❤️</span>
            </div>
            <div style="width: 28px; height: 28px; background: ${primary}20; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <span style="color: ${primary}; font-size: 12px;">💬</span>
            </div>
            <div style="width: 28px; height: 28px; background: ${primary}20; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <span style="color: ${primary}; font-size: 12px;">📤</span>
            </div>
          </div>
          <div style="color: ${secondary}; font-size: 10px; opacity: 0.7;">2 часа назад</div>
        </div>
      </div>
    `;
  }
  
  private generateSocialStoryTemplate(colors: any[], fonts: any[], businessName: string, logoUrl?: string): string {
    const primary = colors[0]?.hex || '#000000';
    const secondary = colors[1]?.hex || '#666666';
    
    return `
      <div style="width: 100%; max-width: 320px; height: 380px; background: linear-gradient(180deg, ${primary} 0%, ${secondary} 60%, ${primary}AA 100%); border-radius: 8px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); padding: 18px; color: white; display: flex; flex-direction: column; justify-content: space-between; text-align: center; position: relative; overflow: hidden; box-sizing: border-box; margin: 0 auto;">
        <div style="position: absolute; top: 8px; left: 8px; width: 50px; height: 50px; background: rgba(255,255,255,0.08); border-radius: 50%; opacity: 0.6;"></div>
        <div style="position: absolute; bottom: 8px; right: 8px; width: 40px; height: 40px; background: rgba(255,255,255,0.05); border-radius: 50%; opacity: 0.4;"></div>
        <div style="position: relative; z-index: 2;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div style="width: 38px; height: 38px; background: ${logoUrl ? '#ffffff' : 'rgba(255,255,255,0.2)'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">
              <span style="color: ${logoUrl ? primary : '#ffffff'}; font-weight: bold; font-size: 8px; text-align: center;">LOGO</span>
            </div>
            <div style="font-size: 10px; opacity: 0.8; background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 8px;">
              ${businessName}
            </div>
          </div>
          <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; margin: 22px 0;">
            <div style="background: rgba(255,255,255,0.12); padding: 18px 14px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.15);">
              <h2 style="font-size: 18px; margin: 0 0 8px 0; font-weight: 800; font-family: ${fonts[0]?.name || 'Arial'}, sans-serif; text-shadow: 0 1px 2px rgba(0,0,0,0.3); line-height: 1.2;">Stories</h2>
              <p style="font-size: 12px; line-height: 1.3; margin: 0; font-family: ${fonts[1]?.name || 'Arial'}, sans-serif; opacity: 0.95;">Яркий и интересный текст Stories для вашей аудитории</p>
            </div>
          </div>
        </div>
        <div style="position: relative; z-index: 2; display: flex; justify-content: center; gap: 6px; margin-top: 12px;">
          <div style="width: 4px; height: 4px; background: white; border-radius: 50%; opacity: 0.5;"></div>
          <div style="width: 4px; height: 4px; background: white; border-radius: 50%; opacity: 1;"></div>
          <div style="width: 4px; height: 4px; background: white; border-radius: 50%; opacity: 0.5;"></div>
        </div>
      </div>
    `;
  }
  
  private generateSocialCoverTemplate(colors: any[], fonts: any[], businessName: string, logoUrl?: string): string {
    const primary = colors[0]?.hex || '#000000';
    const secondary = colors[1]?.hex || '#666666';
    const background = colors.find(c => c.role === 'background')?.hex || '#ffffff';
    
    return `
      <div style="width: 100%; max-width: 672px; height: 240px; background: linear-gradient(135deg, ${background} 0%, ${primary}10 30%, ${secondary}08 70%, ${primary}05 100%); border-radius: 8px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); padding: 22px; display: flex; align-items: center; justify-content: space-between; position: relative; overflow: hidden; box-sizing: border-box; margin: 0 auto;">
        <div style="position: absolute; top: 8px; right: 8px; width: 60px; height: 60px; background: linear-gradient(45deg, ${primary}08, ${primary}15); border-radius: 50%; opacity: 0.6;"></div>
        <div style="position: absolute; bottom: 8px; left: 8px; width: 50px; height: 50px; background: linear-gradient(45deg, ${secondary}08, ${secondary}15); border-radius: 50%; opacity: 0.4;"></div>
        <div style="flex: 1; padding-right: 22px; position: relative; z-index: 2;">
          <div style="background: rgba(255,255,255,0.1); padding: 18px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.2);">
            <h1 style="color: ${primary}; font-size: 22px; margin: 0 0 6px 0; font-weight: 800; font-family: ${fonts[0]?.name || 'Arial'}, sans-serif; text-shadow: 0 1px 2px rgba(0,0,0,0.1); letter-spacing: -0.3px; line-height: 1.2;">${businessName}</h1>
            <p style="color: ${secondary}; font-size: 13px; margin: 0 0 14px 0; font-family: ${fonts[1]?.name || 'Arial'}, sans-serif; line-height: 1.3; opacity: 0.9;">Профессиональные решения для вашего бизнеса</p>
            <div style="display: flex; gap: 8px; align-items: center;">
              <div style="padding: 6px 14px; background: ${primary}; border-radius: 12px; display: inline-block; box-shadow: 0 1px 3px rgba(0,0,0,0.15); cursor: pointer;">
                <span style="color: white; font-size: 11px; font-weight: 600;">Подписаться</span>
              </div>
              <div style="padding: 6px 14px; background: transparent; border: 1px solid ${primary}; border-radius: 12px; display: inline-block; cursor: pointer;">
                <span style="color: ${primary}; font-size: 11px; font-weight: 600;">Узнать больше</span>
              </div>
            </div>
          </div>
        </div>
        <div style="position: relative; z-index: 2;">
          <div style="width: 76px; height: 76px; background: ${logoUrl ? '#ffffff' : primary}; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.15); border: 1px solid ${primary};">
            <span style="color: ${logoUrl ? primary : '#ffffff'}; font-weight: bold; font-size: 11px; text-align: center;">LOGO</span>
          </div>
        </div>
      </div>
    `;
  }
  
  private generateEmailSignatureTemplate(colors: any[], fonts: any[], businessName: string, logoUrl?: string): string {
    const primary = colors[0]?.hex || '#000000';
    const secondary = colors[1]?.hex || '#666666';
    const background = colors.find(c => c.role === 'background')?.hex || '#ffffff';
    
    return `
      <div style="width: 100%; max-width: 480px; height: 180px; background: ${background}; border-radius: 8px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); padding: 20px; display: flex; align-items: center; gap: 18px; position: relative; overflow: hidden; box-sizing: border-box; margin: 0 auto;">
        <div style="position: absolute; top: 4px; right: 4px; width: 40px; height: 40px; background: linear-gradient(45deg, ${primary}05, ${primary}10); border-radius: 50%; opacity: 0.6;"></div>
        <div style="position: relative; z-index: 2;">
          <div style="width: 60px; height: 60px; background: ${logoUrl ? '#ffffff' : primary}; border: 1px solid ${primary}; border-radius: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); flex-shrink: 0;">
            <span style="color: ${logoUrl ? primary : '#ffffff'}; font-weight: bold; font-size: 9px; text-align: center;">LOGO</span>
          </div>
        </div>
        <div style="flex: 1; position: relative; z-index: 2;">
          <div style="border-left: 2px solid ${primary}; padding-left: 14px;">
            <h3 style="color: ${primary}; font-size: 16px; margin: 0 0 3px 0; font-weight: 700; font-family: ${fonts[0]?.name || 'Arial'}, sans-serif; line-height: 1.2;">Имя Фамилия</h3>
            <p style="color: ${secondary}; font-size: 12px; margin: 0 0 10px 0; font-family: ${fonts[1]?.name || 'Arial'}, sans-serif; opacity: 0.8; line-height: 1.2;">Должность</p>
            <div style="color: ${secondary}; font-size: 11px; line-height: 1.3; font-family: ${fonts[1]?.name || 'Arial'}, sans-serif; opacity: 0.9;">
              <div style="margin-bottom: 4px;">
                <span style="color: ${primary}; font-weight: 600;">${businessName}</span>
              </div>
              <div style="margin-bottom: 4px;">
                <span style="color: ${primary}; margin-right: 4px;">📞</span>
                <span>+7 (xxx) xxx-xx-xx</span>
              </div>
              <div style="margin-bottom: 4px;">
                <span style="color: ${primary}; margin-right: 4px;">✉</span>
                <span>email@company.com</span>
              </div>
              <div>
                <span style="color: ${primary}; margin-right: 4px;">🌐</span>
                <span>www.company.com</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

// Экспорт сингл-тона
export const applicationsService = new ApplicationsService(); 