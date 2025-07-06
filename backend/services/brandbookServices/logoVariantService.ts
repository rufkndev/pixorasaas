import axios from 'axios';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { colord } from 'colord';

export interface LogoVariant {
  name: string;
  url: string;
  description: string;
  type: string;
  usage: string;
  filter?: string;
  text?: string;
  font?: string;
}

// Сервис для создания вариаций логотипов
export class LogoVariantService {
  // Функция для скачивания изображения по URL
  private async downloadImage(imageUrl: string): Promise<Buffer> {
    const response = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'arraybuffer'
    });
    return Buffer.from(response.data);
  }

  // Создание монохромной версии логотипа
  private async createMonochromeVersion(imageBuffer: Buffer): Promise<Buffer> {
    return await sharp(imageBuffer)
      .grayscale()
      .png()
      .toBuffer();
  }

  // Создание инвертированной версии логотипа
  private async createInvertedVersion(imageBuffer: Buffer): Promise<Buffer> {
    return await sharp(imageBuffer)
      .negate()
      .png()
      .toBuffer();
  }

  // Извлечение доминантных цветов из логотипа
  private async extractDominantColors(imageBuffer: Buffer): Promise<{primary: string, secondary: string}> {
    try {
      // Получаем статистику по цветам
      const { dominant } = await sharp(imageBuffer).stats();
      
      // Создаем цвета на основе доминантного цвета
      const r = Math.round(dominant.r);
      const g = Math.round(dominant.g);
      const b = Math.round(dominant.b);
      
      const primary = `rgb(${r}, ${g}, ${b})`;
      
      // Создаем более темный вторичный цвет
      const darkerR = Math.max(0, r - 40);
      const darkerG = Math.max(0, g - 40);
      const darkerB = Math.max(0, b - 40);
      const secondary = `rgb(${darkerR}, ${darkerG}, ${darkerB})`;
      
      return { primary, secondary };
    } catch (error) {
      console.warn('Could not extract colors from logo, using defaults');
      // Возвращаем профессиональные цвета по умолчанию
      return {
        primary: 'rgb(37, 99, 235)', // blue-600
        secondary: 'rgb(29, 78, 216)' // blue-700
      };
    }
  }

  // Анализ стиля логотипа для выбора подходящего шрифта
  private async analyzeLogoStyle(imageBuffer: Buffer): Promise<string> {
    try {
      // Получаем метаданные изображения для анализа
      const metadata = await sharp(imageBuffer).metadata();
      const { dominant } = await sharp(imageBuffer).stats();
      
      // Анализируем яркость для определения стиля
      const brightness = (dominant.r + dominant.g + dominant.b) / 3;
      const saturation = Math.max(dominant.r, dominant.g, dominant.b) - Math.min(dominant.r, dominant.g, dominant.b);
      
      // Выбираем шрифт на основе анализа
      if (brightness > 200 && saturation < 30) {
        // Светлый и ненасыщенный - минималистичный стиль
        return "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
      } else if (saturation > 100) {
        // Яркий и насыщенный - современный стиль  
        return "'Poppins', 'Inter', system-ui, sans-serif";
      } else if (brightness < 100) {
        // Темный - классический стиль
        return "'Roboto', 'Helvetica Neue', Arial, sans-serif";
      } else {
        // Сбалансированный - универсальный стиль
        return "'Source Sans Pro', 'Segoe UI', system-ui, sans-serif";
      }
    } catch (error) {
      // По умолчанию используем универсальный современный шрифт
      return "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
    }
  }

  // Создание логотипа-аббревиатуры
  private async createAbbreviationLogo(brandName: string, originalBuffer: Buffer): Promise<Buffer> {
    // Извлекаем инициалы из названия бренда
    const words = brandName.split(' ').filter(word => word.length > 0);
    const abbreviation = words.length > 1 
      ? words.map(word => word.charAt(0).toUpperCase()).join('')
      : brandName.substring(0, 2).toUpperCase();

    // Извлекаем цвета из оригинального логотипа
    const colors = await this.extractDominantColors(originalBuffer);
    
    // Анализируем стиль логотипа для выбора шрифта
    const fontFamily = await this.analyzeLogoStyle(originalBuffer);

    // Создаем SVG для логотипа-аббревиатуры
    const size = 400;
    const fontSize = Math.min(160, size / abbreviation.length * 1.1);
    
    // Определяем стиль контейнера на основе цветов
    const { dominant } = await sharp(originalBuffer).stats();
    const avgColor = (dominant.r + dominant.g + dominant.b) / 3;
    const isLightPalette = avgColor > 150;
    
    const svgLogo = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${colors.secondary};stop-opacity:1" />
          </linearGradient>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:rgba(255,255,255,${isLightPalette ? '0.95' : '0.1'});stop-opacity:1" />
            <stop offset="100%" style="stop-color:rgba(255,255,255,${isLightPalette ? '0.8' : '0.05'});stop-opacity:1" />
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="rgba(0,0,0,0.15)"/>
          </filter>
          <filter id="innerShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.1)"/>
          </filter>
        </defs>
        
        <!-- Внешний контейнер с тенью -->
        <circle cx="${size/2}" cy="${size/2}" r="${size/2-15}" fill="url(#grad)" filter="url(#shadow)" />
        
        <!-- Внутренний слой для глубины -->
        <circle cx="${size/2}" cy="${size/2}" r="${size/2-25}" fill="url(#bgGrad)" opacity="0.3" />
        
        <!-- Текст аббревиатуры -->
        <text x="${size/2}" y="${size/2 + fontSize/3}" 
              font-family="${fontFamily}" 
              font-size="${fontSize}" 
              font-weight="900" 
              text-anchor="middle" 
              fill="white"
              filter="url(#innerShadow)"
              style="letter-spacing: ${abbreviation.length > 2 ? '0.02em' : abbreviation.length > 1 ? '0.08em' : '0'}">
          ${abbreviation}
        </text>
      </svg>
    `;

    // Конвертируем SVG в PNG
    return await sharp(Buffer.from(svgLogo))
      .png()
      .toBuffer();
  }

  // Создание логотипа с названием снизу
  private async createLogoWithTextBelow(imageBuffer: Buffer, brandName: string): Promise<Buffer> {
    // Получаем размеры оригинального логотипа  
    const metadata = await sharp(imageBuffer).metadata();
    const logoWidth = metadata.width || 300;
    const logoHeight = metadata.height || 300;
    
    // Извлекаем цвета из оригинального логотипа
    const colors = await this.extractDominantColors(imageBuffer);
    
    // Рассчитываем размеры для цельного логотипа
    const totalWidth = 600; // Фиксированная ширина для пропорциональности
    
    // Логотип будет занимать верхнюю часть, но компактнее
    const logoAreaHeight = Math.round(totalWidth * 0.4); // 40% от ширины для логотипа
    const textAreaHeight = Math.round(totalWidth * 0.2); // 20% для текста
    const totalHeight = logoAreaHeight + textAreaHeight + 20; // Небольшой отступ
    
    // Размер шрифта пропорционален общему размеру
    const fontSize = Math.min(72, Math.max(48, totalWidth / brandName.length * 0.8));
    
    // Создаем фон с легким градиентом для единого стиля
    const backgroundSvg = `
      <svg width="${totalWidth}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:rgba(255,255,255,1);stop-opacity:1" />
            <stop offset="100%" style="stop-color:rgba(248,250,252,1);stop-opacity:1" />
          </linearGradient>
          <filter id="containerShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="12" flood-color="rgba(0,0,0,0.1)"/>
          </filter>
        </defs>
        <rect width="${totalWidth}" height="${totalHeight}" rx="20" ry="20" fill="url(#bgGrad)" filter="url(#containerShadow)" />
      </svg>
    `;

    // Создаем название с крупными буквами
    const textSvg = `
      <svg width="${totalWidth}" height="${textAreaHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${colors.secondary};stop-opacity:1" />
          </linearGradient>
          <filter id="textShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="rgba(0,0,0,0.2)"/>
          </filter>
        </defs>
        <text x="${totalWidth/2}" y="${textAreaHeight/2 + fontSize/3}" 
              font-family="'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
              font-size="${fontSize}" 
              font-weight="800" 
              text-anchor="middle" 
              fill="url(#textGrad)"
              filter="url(#textShadow)"
              style="letter-spacing: 0.05em; text-transform: uppercase;">
          ${brandName}
        </text>
      </svg>
    `;

    // Создаем фон
    const backgroundBuffer = await sharp(Buffer.from(backgroundSvg))
      .png()
      .toBuffer();

    // Конвертируем SVG текста в буфер
    const textBuffer = await sharp(Buffer.from(textSvg))
      .png()
      .toBuffer();

    // Уменьшаем логотип для компактности - он должен быть частью общего дизайна
    const maxLogoSize = Math.min(logoAreaHeight * 0.7, totalWidth * 0.3);
    const compactLogo = await sharp(imageBuffer)
      .resize(Math.round(maxLogoSize), Math.round(maxLogoSize), { 
        fit: 'inside', 
        withoutEnlargement: false 
      })
      .png()
      .toBuffer();

    // Получаем новые размеры компактного логотипа
    const compactMetadata = await sharp(compactLogo).metadata();
    const compactLogoWidth = compactMetadata.width || maxLogoSize;
    const compactLogoHeight = compactMetadata.height || maxLogoSize;

    // Собираем итоговое изображение
    return await sharp(backgroundBuffer)
      .composite([
        {
          input: compactLogo,
          top: Math.round((logoAreaHeight - compactLogoHeight) / 2) + 10,
          left: Math.round((totalWidth - compactLogoWidth) / 2)
        },
        {
          input: textBuffer,
          top: logoAreaHeight + 10,
          left: 0
        }
      ])
      .png()
      .toBuffer();
  }

  // Сохранение буфера изображения в файл и возврат URL
  private async saveImageBuffer(buffer: Buffer, filename: string): Promise<string> {
    const publicDir = path.join(process.cwd(), 'public', 'generated-logos');
    
    // Создаем директорию если её нет
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    const filePath = path.join(publicDir, filename);
    fs.writeFileSync(filePath, buffer);
    
    // Возвращаем относительный URL
    return `/generated-logos/${filename}`;
  }

  // Генерация базовых вариаций логотипа (для демо)
  async generateBasicLogoVariants(originalLogoUrl: string, brandName: string): Promise<LogoVariant[]> {
    try {
      console.log(`Generating basic logo variants for: ${brandName}`);
      
      // Скачиваем оригинальное изображение
      const originalBuffer = await this.downloadImage(originalLogoUrl);
      
      // Создаем уникальные имена файлов
      const timestamp = Date.now();
      const sanitizedName = brandName.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Создаем только базовые монохромную и инвертированную версии
      const monochromeBuffer = await this.createMonochromeVersion(originalBuffer);
      const monochromeUrl = await this.saveImageBuffer(
        monochromeBuffer, 
        `${sanitizedName}_monochrome_${timestamp}.png`
      );
      
      const invertedBuffer = await this.createInvertedVersion(originalBuffer);
      const invertedUrl = await this.saveImageBuffer(
        invertedBuffer, 
        `${sanitizedName}_inverted_${timestamp}.png`
      );
      
      const logoVariants: LogoVariant[] = [
        {
          name: 'Оригинальный логотип',
          url: originalLogoUrl,
          description: 'Основная версия логотипа в полном цвете',
          type: 'original',
          usage: 'Используется на цветных фонах и в основных материалах бренда'
        },
        {
          name: 'Монохромный логотип',
          url: monochromeUrl,
          description: 'Черно-белая версия логотипа для универсального использования',
          type: 'monochrome',
          usage: 'Идеально подходит для печати, факсов, черно-белых документов',
          filter: 'grayscale'
        },
        {
          name: 'Инвертированный логотип',
          url: invertedUrl,
          description: 'Инвертированная версия для использования на темных фонах',
          type: 'inverted',
          usage: 'Используется на темных фонах, в ночных режимах интерфейсов',
          filter: 'invert'
        }
      ];
      
      console.log(`Generated ${logoVariants.length} basic logo variants`);
      return logoVariants;
      
    } catch (error) {
      console.error('Error generating basic logo variants:', error);
      
      // Возвращаем хотя бы оригинал, если не удалось создать вариации
      return [{
        name: 'Оригинальный логотип',
        url: originalLogoUrl,
        description: 'Основная версия логотипа',
        type: 'original',
        usage: 'Используется во всех материалах бренда'
      }];
    }
  }

  // Генерация вариаций логотипа
  async generateLogoVariants(originalLogoUrl: string, brandName: string): Promise<LogoVariant[]> {
    // Для полного функционала будет реализован позже
    // Пока используем базовые варианты
    return await this.generateBasicLogoVariants(originalLogoUrl, brandName);
  }
}

// Экспорт экземпляра для переиспользования
export const logoVariantService = new LogoVariantService(); 