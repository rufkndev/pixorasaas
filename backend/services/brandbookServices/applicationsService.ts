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
      template: this.generateEmailSignatureTemplate(primary, secondary, text, fonts, businessName, logoUrl)
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
      <div style="width: 340px; height: 200px; background: linear-gradient(135deg, white 0%, ${primary}05 100%); border-radius: 12px; box-shadow: 0 6px 24px rgba(0,0,0,0.1); border: 1px solid ${primary}15; position: relative;">
        <div style="position: absolute; top: -10px; right: -10px; width: 60px; height: 60px; background: linear-gradient(45deg, ${primary}10, ${primary}20); border-radius: 50%; opacity: 0.6;"></div>
        <div style="padding: 20px; height: 100%; display: flex; flex-direction: column; justify-content: space-between; position: relative; z-index: 1;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="flex: 1; margin-right: 15px;">
              <h3 style="color: ${primary}; font-size: 20px; margin: 0 0 5px 0; font-weight: 700; font-family: ${fonts[0]?.name || 'Arial'}, sans-serif;">${businessName}</h3>
              <div style="height: 2px; width: 30px; background: ${primary}; margin: 0 0 12px 0; border-radius: 1px;"></div>
            </div>
            <div style="width: 50px; height: 50px; background: ${logoUrl ? 'white' : primary}; border-radius: 10px; display: flex; align-items: center; justify-content: center; overflow: hidden; box-shadow: 0 3px 12px rgba(0,0,0,0.1); flex-shrink: 0;">
              ${logoUrl 
                ? `<img src="${logoUrl}" alt="Logo" style="width: 85%; height: 85%; object-fit: contain;">` 
                : `<span style="color: white; font-weight: bold; font-size: 10px;">LOGO</span>`
              }
            </div>
          </div>
          <div>
            <p style="color: ${text}; font-size: 16px; margin: 0 0 4px 0; font-family: ${fonts[1]?.name || 'Arial'}, sans-serif; font-weight: 600;">Имя Фамилия</p>
            <p style="color: ${secondary}; font-size: 13px; margin: 0 0 14px 0; font-family: ${fonts[1]?.name || 'Arial'}, sans-serif; opacity: 0.8;">Должность в компании</p>
            <div style="display: flex; flex-wrap: wrap; gap: 6px; font-size: 11px; font-family: ${fonts[1]?.name || 'Arial'}, sans-serif;">
              <div style="display: flex; align-items: center; background: ${primary}08; padding: 4px 8px; border-radius: 12px; color: ${primary};">
                <span style="margin-right: 4px;">📞</span>
                <span>+7 (xxx) xxx-xx-xx</span>
              </div>
              <div style="display: flex; align-items: center; background: ${primary}08; padding: 4px 8px; border-radius: 12px; color: ${primary};">
                <span style="margin-right: 4px;">✉</span>
                <span>email@company.com</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  private generateCoverTemplate(primary: string, secondary: string, background: string, businessName: string): string {
    return `
      <div style="width: 800px; height: 600px; background: linear-gradient(135deg, ${background} 0%, ${primary}08 50%, ${secondary}05 100%); position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
        <div style="position: absolute; top: -100px; right: -100px; width: 300px; height: 300px; background: linear-gradient(45deg, ${primary}15, ${primary}25); border-radius: 50%; opacity: 0.6;"></div>
        <div style="position: absolute; bottom: -150px; left: -150px; width: 400px; height: 400px; background: linear-gradient(45deg, ${secondary}10, ${secondary}20); border-radius: 50%; opacity: 0.4;"></div>
        <div style="position: relative; z-index: 2; backdrop-filter: blur(1px); background: rgba(255,255,255,0.05); padding: 80px; border-radius: 32px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 16px 64px rgba(0,0,0,0.1);">
          <div style="width: 100px; height: 4px; background: ${primary}; margin: 0 auto 50px auto; border-radius: 2px;"></div>
          <h1 style="color: ${primary}; font-size: 56px; margin: 0 0 20px 0; font-weight: 800; letter-spacing: -2px; text-shadow: 0 4px 8px rgba(0,0,0,0.1);">Презентация</h1>
          <h2 style="color: ${secondary}; font-size: 36px; margin: 0 0 60px 0; font-weight: 300; opacity: 0.9; letter-spacing: -1px;">${businessName}</h2>
          <div style="width: 80px; height: 80px; background: ${primary}; margin: 0 auto; border-radius: 24px; display: flex; align-items: center; justify-content: center; box-shadow: 0 12px 40px rgba(0,0,0,0.2); transition: all 0.3s ease;">
            <span style="color: white; font-size: 32px; margin-left: 4px;">▶</span>
          </div>
        </div>
      </div>
    `;
  }
  
  private generateSlideTemplate(primary: string, secondary: string, background: string, text: string): string {
    return `
      <div style="width: 800px; height: 600px; background: linear-gradient(135deg, ${background} 0%, ${primary}03 100%); padding: 60px; color: ${text}; position: relative; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.1);">
        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 6px; background: linear-gradient(90deg, ${primary} 0%, ${secondary} 100%); border-radius: 16px 16px 0 0;"></div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
          <div style="flex: 1;">
            <h1 style="color: ${primary}; font-size: 40px; margin: 0 0 10px 0; font-weight: 700; letter-spacing: -1px; line-height: 1.2;">Заголовок слайда</h1>
            <div style="width: 60px; height: 3px; background: ${primary}; border-radius: 2px;"></div>
          </div>
          <div style="width: 70px; height: 70px; background: ${primary}; border-radius: 16px; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px; font-weight: bold; box-shadow: 0 8px 24px rgba(0,0,0,0.15);">
            LOGO
          </div>
        </div>
        <div style="display: flex; gap: 50px; align-items: stretch;">
          <div style="flex: 1;">
            <h2 style="color: ${secondary}; font-size: 24px; margin: 0 0 20px 0; font-weight: 600;">Подзаголовок</h2>
            <p style="font-size: 18px; line-height: 1.8; margin: 0 0 30px 0; opacity: 0.9;">Основной текст презентации. Здесь размещается детальное содержимое слайда с важной информацией.</p>
            <div style="display: flex; gap: 15px; margin-top: 30px;">
              <div style="width: 8px; height: 8px; background: ${primary}; border-radius: 50%;"></div>
              <div style="flex: 1;">
                <p style="font-size: 16px; margin: 0; opacity: 0.8;">Ключевой пункт 1</p>
              </div>
            </div>
            <div style="display: flex; gap: 15px; margin-top: 15px;">
              <div style="width: 8px; height: 8px; background: ${primary}; border-radius: 50%;"></div>
              <div style="flex: 1;">
                <p style="font-size: 16px; margin: 0; opacity: 0.8;">Ключевой пункт 2</p>
              </div>
            </div>
          </div>
          <div style="flex: 1;">
            <div style="width: 100%; height: 280px; background: linear-gradient(135deg, ${primary}05, ${secondary}03); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: ${secondary}; font-size: 18px; font-weight: 500; border: 2px dashed ${primary}40; position: relative;">
              <div style="text-align: center;">
                <div style="width: 60px; height: 60px; background: ${primary}15; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px auto;">
                  <span style="font-size: 24px; color: ${primary};">📊</span>
                </div>
                <p style="margin: 0; opacity: 0.7;">Изображение или график</p>
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
      <div style="width: 450px; height: 320px; background: linear-gradient(135deg, ${background} 0%, ${primary}08 50%, ${secondary}05 100%); padding: 20px; display: flex; flex-direction: column; justify-content: space-between; position: relative; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); border: 1px solid ${primary}15;">
        <div style="position: absolute; top: 12px; right: 12px; width: 60px; height: 60px; background: linear-gradient(45deg, ${primary}10, ${primary}20); border-radius: 50%; opacity: 0.5;"></div>
        <div style="position: relative; z-index: 2;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div style="width: 45px; height: 45px; background: ${logoUrl ? 'white' : primary}; border-radius: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(0,0,0,0.1); overflow: hidden;">
              ${logoUrl 
                ? `<img src="${logoUrl}" alt="Logo" style="width: 85%; height: 85%; object-fit: contain;">` 
                : `<span style="color: white; font-size: 10px; font-weight: bold;">LOGO</span>`
              }
            </div>
            <div style="font-size: 14px; color: ${secondary}; font-weight: 500; opacity: 0.8;">${businessName}</div>
          </div>
          <div style="background: rgba(255,255,255,0.9); backdrop-filter: blur(8px); padding: 20px; border-radius: 14px; box-shadow: 0 6px 24px rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.3);">
            <h2 style="color: ${primary}; font-size: 22px; margin: 0 0 10px 0; font-weight: 700; font-family: ${fonts[0]?.name || 'Arial'}, sans-serif; line-height: 1.3;">Заголовок поста</h2>
            <p style="color: #555; font-size: 16px; line-height: 1.5; margin: 0; font-family: ${fonts[1]?.name || 'Arial'}, sans-serif; opacity: 0.9;">Увлекательное описание или основной текст поста для социальных сетей</p>
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; position: relative; z-index: 2;">
          <div style="display: flex; gap: 12px;">
            <div style="width: 36px; height: 36px; background: ${primary}20; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <span style="color: ${primary}; font-size: 14px;">❤️</span>
            </div>
            <div style="width: 36px; height: 36px; background: ${primary}20; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <span style="color: ${primary}; font-size: 14px;">💬</span>
            </div>
            <div style="width: 36px; height: 36px; background: ${primary}20; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <span style="color: ${primary}; font-size: 14px;">📤</span>
            </div>
          </div>
          <div style="color: ${secondary}; font-size: 12px; opacity: 0.7;">2 часа назад</div>
        </div>
      </div>
    `;
  }
  
  private generateSocialStoryTemplate(colors: any[], fonts: any[], businessName: string, logoUrl?: string): string {
    const primary = colors[0]?.hex || '#000000';
    const secondary = colors[1]?.hex || '#666666';
    
    return `
      <div style="width: 280px; height: 400px; background: linear-gradient(180deg, ${primary} 0%, ${secondary} 60%, ${primary}AA 100%); padding: 24px; color: white; display: flex; flex-direction: column; justify-content: space-between; text-align: center; border-radius: 20px; box-shadow: 0 12px 36px rgba(0,0,0,0.25); position: relative; border: 1px solid rgba(255,255,255,0.1);">
        <div style="position: absolute; top: 14px; left: 14px; width: 70px; height: 70px; background: rgba(255,255,255,0.08); border-radius: 50%; opacity: 0.6;"></div>
        <div style="position: absolute; bottom: 14px; right: 14px; width: 56px; height: 56px; background: rgba(255,255,255,0.05); border-radius: 50%; opacity: 0.4;"></div>
        <div style="position: relative; z-index: 2;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div style="width: 52px; height: 52px; background: ${logoUrl ? 'white' : 'rgba(255,255,255,0.2)'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(0,0,0,0.2); overflow: hidden;">
              ${logoUrl 
                ? `<img src="${logoUrl}" alt="Logo" style="width: 75%; height: 75%; object-fit: contain;">` 
                : `<span style="color: ${primary}; font-weight: bold; font-size: 11px;">LOGO</span>`
              }
            </div>
            <div style="font-size: 12px; opacity: 0.8; background: rgba(255,255,255,0.1); padding: 6px 12px; border-radius: 12px;">
              ${businessName}
            </div>
          </div>
          <div style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
            <div style="background: rgba(255,255,255,0.12); backdrop-filter: blur(15px); padding: 22px 16px; border-radius: 16px; box-shadow: 0 6px 24px rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.15);">
              <h2 style="font-size: 24px; margin: 0 0 10px 0; font-weight: 800; font-family: ${fonts[0]?.name || 'Arial'}, sans-serif; text-shadow: 0 2px 4px rgba(0,0,0,0.3); line-height: 1.2;">Stories</h2>
              <p style="font-size: 14px; line-height: 1.4; margin: 0; font-family: ${fonts[1]?.name || 'Arial'}, sans-serif; opacity: 0.95;">Яркий и интересный текст Stories для вашей аудитории</p>
            </div>
          </div>
        </div>
        <div style="position: relative; z-index: 2; display: flex; justify-content: center; gap: 8px; margin-top: 16px;">
          <div style="width: 6px; height: 6px; background: white; border-radius: 50%; opacity: 0.5;"></div>
          <div style="width: 6px; height: 6px; background: white; border-radius: 50%; opacity: 1;"></div>
          <div style="width: 6px; height: 6px; background: white; border-radius: 50%; opacity: 0.5;"></div>
        </div>
      </div>
    `;
  }
  
  private generateSocialCoverTemplate(colors: any[], fonts: any[], businessName: string, logoUrl?: string): string {
    const primary = colors[0]?.hex || '#000000';
    const secondary = colors[1]?.hex || '#666666';
    const background = colors.find(c => c.role === 'background')?.hex || '#ffffff';
    
    return `
      <div style="width: 700px; height: 260px; background: linear-gradient(135deg, ${background} 0%, ${primary}10 30%, ${secondary}08 70%, ${primary}05 100%); padding: 26px; display: flex; align-items: center; justify-content: space-between; border-radius: 20px; box-shadow: 0 12px 32px rgba(0,0,0,0.12); position: relative; border: 1px solid ${primary}10;">
        <div style="position: absolute; top: 12px; right: 12px; width: 100px; height: 100px; background: linear-gradient(45deg, ${primary}08, ${primary}15); border-radius: 50%; opacity: 0.6;"></div>
        <div style="position: absolute; bottom: 12px; left: 12px; width: 78px; height: 78px; background: linear-gradient(45deg, ${secondary}08, ${secondary}15); border-radius: 50%; opacity: 0.4;"></div>
        <div style="flex: 1; padding-right: 26px; position: relative; z-index: 2;">
          <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(8px); padding: 24px; border-radius: 16px; box-shadow: 0 6px 24px rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.2);">
            <h1 style="color: ${primary}; font-size: 32px; margin: 0 0 10px 0; font-weight: 800; font-family: ${fonts[0]?.name || 'Arial'}, sans-serif; text-shadow: 0 2px 4px rgba(0,0,0,0.1); letter-spacing: -1px;">${businessName}</h1>
            <p style="color: ${secondary}; font-size: 16px; margin: 0 0 18px 0; font-family: ${fonts[1]?.name || 'Arial'}, sans-serif; line-height: 1.3; opacity: 0.9;">Профессиональные решения для вашего бизнеса</p>
            <div style="display: flex; gap: 12px; align-items: center;">
              <div style="padding: 10px 20px; background: ${primary}; border-radius: 24px; display: inline-block; box-shadow: 0 4px 16px rgba(0,0,0,0.15); cursor: pointer;">
                <span style="color: white; font-size: 14px; font-weight: 600;">Подписаться</span>
              </div>
              <div style="padding: 10px 20px; background: transparent; border: 1px solid ${primary}; border-radius: 24px; display: inline-block; cursor: pointer;">
                <span style="color: ${primary}; font-size: 14px; font-weight: 600;">Узнать больше</span>
              </div>
            </div>
          </div>
        </div>
        <div style="position: relative; z-index: 2;">
          <div style="width: 120px; height: 120px; background: ${logoUrl ? 'white' : primary}; border-radius: 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 28px rgba(0,0,0,0.15); overflow: hidden; border: 1px solid rgba(255,255,255,0.3);">
            ${logoUrl 
              ? `<img src="${logoUrl}" alt="Logo" style="width: 85%; height: 85%; object-fit: contain;">` 
              : `<span style="color: white; font-weight: bold; font-size: 16px;">LOGO</span>`
            }
          </div>
        </div>
      </div>
    `;
  }
  
  private generateEmailSignatureTemplate(primary: string, secondary: string, text: string, fonts: any[], businessName: string, logoUrl?: string): string {
    return `
      <div style="font-family: ${fonts[1]?.name || 'Arial'}, sans-serif; font-size: 14px; color: ${text}; line-height: 1.5; border-left: 4px solid ${primary}; padding-left: 20px; margin: 20px 0; max-width: 500px;">
        <table style="border-collapse: collapse; width: 100%;">
          <tr>
            <td style="padding-right: 20px; vertical-align: top; width: 80px;">
              <div style="width: 70px; height: 70px; background: ${logoUrl ? 'white' : primary}; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden; border: 2px solid ${primary};">
                ${logoUrl 
                  ? `<img src="${logoUrl}" alt="Logo" style="width: 85%; height: 85%; object-fit: contain;">` 
                  : `<span style="color: white; font-weight: bold; font-size: 11px;">LOGO</span>`
                }
              </div>
            </td>
            <td style="vertical-align: top;">
              <div style="font-family: ${fonts[0]?.name || 'Arial'}, sans-serif; font-size: 18px; color: ${primary}; font-weight: bold; margin-bottom: 6px; letter-spacing: 0.5px;">
                Имя Фамилия
              </div>
              <div style="color: ${secondary}; font-size: 14px; margin-bottom: 8px; font-style: italic;">
                Должность в компании
              </div>
              <div style="color: ${primary}; font-weight: 600; margin-bottom: 12px; font-size: 15px;">
                ${businessName}
              </div>
              <div style="font-size: 13px; line-height: 1.6;">
                <div style="margin-bottom: 3px; color: ${text};">
                  <span style="color: ${primary};">✉</span> email@company.com
                </div>
                <div style="margin-bottom: 3px; color: ${text};">
                  <span style="color: ${primary};">📱</span> +7 (xxx) xxx-xx-xx
                </div>
                <div style="color: ${text};">
                  <span style="color: ${primary};">🌐</span> www.company.com
                </div>
              </div>
            </td>
          </tr>
        </table>
        <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #e0e0e0; font-size: 11px; color: #888;">
          Это сообщение может содержать конфиденциальную информацию
        </div>
      </div>
    `;
  }
}

// Экспорт сингл-тона
export const applicationsService = new ApplicationsService(); 