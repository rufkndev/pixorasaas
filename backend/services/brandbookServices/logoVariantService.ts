import axios from 'axios';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

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

export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  neutral: string;
  background: string;
  text: string;
}

export interface BrandFont {
  name: string;
  type: string;
  url: string;
  category: string;
  family: string;
  weights: string[];
  googleFontUrl?: string;
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

  // Создание логотипа с полным названием в квадратном дизайне
  private async createAbbreviationLogo(
    brandName: string, 
    brandColors: BrandColors, 
    brandFonts: BrandFont[]
  ): Promise<Buffer> {
    // Получаем основной шрифт из фирменных шрифтов
    const mainFont = brandFonts.find(font => font.type === 'primary') || brandFonts[0];
    
    // Определяем правильные fallback шрифты в зависимости от категории
    let fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
    if (mainFont) {
      switch (mainFont.category) {
        case 'monospace':
          fontFamily = `'${mainFont.name}', 'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'Consolas', monospace`;
          break;
        case 'serif':
          fontFamily = `'${mainFont.name}', 'Times New Roman', 'Georgia', serif`;
          break;
        case 'sans-serif':
        default:
          fontFamily = `'${mainFont.name}', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`;
          break;
      }
    }

    // Разделяем название на слова
    const words = brandName.split(' ').filter(word => word.length > 0);
    
    // Создаем SVG для логотипа с полным названием в квадрате
    const size = 400;
    const borderRadius = 40; // Закругление углов
    const padding = 30;
    
    // Рассчитываем размер шрифта в зависимости от количества слов и длины
    const maxWordLength = Math.max(...words.map(word => word.length));
    const fontSize = Math.min(60, Math.max(24, (size - padding * 2) / Math.max(maxWordLength * 0.7, words.length * 1.2)));
    
    // Рассчитываем позиции для центрирования многострочного текста
    const lineHeight = fontSize * 1.2;
    const totalTextHeight = words.length * lineHeight;
    const startY = (size - totalTextHeight) / 2 + fontSize * 0.8;
    
    // Создаем текстовые элементы для каждого слова
    const textElements = words.map((word, index) => {
      const yPosition = startY + index * lineHeight;
      return `
        <text x="${size/2}" y="${yPosition}" 
              font-family="${fontFamily}" 
              font-size="${fontSize}" 
              font-weight="900" 
              text-anchor="middle" 
              fill="${brandColors.primary}"
              filter="url(#innerShadow)"
              style="letter-spacing: 0.02em; text-transform: uppercase;">
          ${word}
        </text>
      `;
    }).join('');
    
    const svgLogo = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${brandColors.primary};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${brandColors.secondary};stop-opacity:1" />
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="rgba(0,0,0,0.2)"/>
          </filter>
          <filter id="innerShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.1)"/>
          </filter>
        </defs>
        
        <!-- Фон - закругленный квадрат с фирменным цветом -->
        <rect x="15" y="15" width="${size-30}" height="${size-30}" 
              rx="${borderRadius}" ry="${borderRadius}" 
              fill="${brandColors.neutral}" 
              filter="url(#shadow)" />
        
        <!-- Внутренний слой для глубины -->
        <rect x="25" y="25" width="${size-50}" height="${size-50}" 
              rx="${borderRadius-10}" ry="${borderRadius-10}" 
              fill="rgba(255,255,255,0.1)" />
        
        <!-- Полное название бренда - каждое слово на новой строке -->
        ${textElements}
      </svg>
    `;

    // Конвертируем SVG в PNG
    return await sharp(Buffer.from(svgLogo))
      .png()
      .toBuffer();
  }

  // Создание логотипа с названием снизу
  private async createLogoWithTextBelow(
    imageBuffer: Buffer, 
    brandName: string, 
    brandColors: BrandColors, 
    brandFonts: BrandFont[]
  ): Promise<Buffer> {
    // Получаем размеры оригинального логотипа  
    const metadata = await sharp(imageBuffer).metadata();
    const logoWidth = metadata.width || 300;
    const logoHeight = metadata.height || 300;
    
    // Получаем основной шрифт из фирменных шрифтов
    const mainFont = brandFonts.find(font => font.type === 'primary') || brandFonts[0];
    
    // Определяем правильные fallback шрифты в зависимости от категории
    let fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
    if (mainFont) {
      switch (mainFont.category) {
        case 'monospace':
          fontFamily = `'${mainFont.name}', 'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'Consolas', monospace`;
          break;
        case 'serif':
          fontFamily = `'${mainFont.name}', 'Times New Roman', 'Georgia', serif`;
          break;
        case 'sans-serif':
        default:
          fontFamily = `'${mainFont.name}', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`;
          break;
      }
    }
    
    // Разделяем название на слова
    const words = brandName.split(' ').filter(word => word.length > 0);
    
    // Рассчитываем размеры для цельного логотипа без фона
    const totalWidth = 600;
    const logoAreaHeight = Math.round(totalWidth * 0.5); // Больше места для логотипа
    
    // Рассчитываем размер шрифта в зависимости от количества слов и длины
    const maxWordLength = Math.max(...words.map(word => word.length));
    const fontSize = Math.min(72, Math.max(36, totalWidth / Math.max(maxWordLength * 0.8, 10)));
    
    // Рассчитываем высоту текстовой области в зависимости от количества строк
    const lineHeight = fontSize * 1.3;
    const textAreaHeight = Math.max(Math.round(totalWidth * 0.2), words.length * lineHeight + 20);
    const totalHeight = logoAreaHeight + textAreaHeight + 40; // Отступ между элементами
    
    // Создаем прозрачный фон
    const transparentBackground = await sharp({
      create: {
        width: totalWidth,
        height: totalHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    }).png().toBuffer();

    // Рассчитываем позиции для центрирования многострочного текста
    const totalTextHeight = words.length * lineHeight;
    const startY = (textAreaHeight - totalTextHeight) / 2 + fontSize * 0.8;
    
    // Создаем текстовые элементы для каждого слова
    const textElements = words.map((word, index) => {
      const yPosition = startY + index * lineHeight;
      return `
        <text x="${totalWidth/2}" y="${yPosition}" 
              font-family="${fontFamily}" 
              font-size="${fontSize}" 
              font-weight="800" 
              text-anchor="middle" 
              fill="#000000"
              filter="url(#textShadow)"
              style="letter-spacing: 0.05em; text-transform: uppercase;">
          ${word}
        </text>
      `;
    }).join('');

    // Создаем название с черным цветом - многострочный текст
    const textSvg = `
      <svg width="${totalWidth}" height="${textAreaHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="textShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.1)"/>
          </filter>
        </defs>
        ${textElements}
      </svg>
    `;

    // Конвертируем SVG текста в буфер
    const textBuffer = await sharp(Buffer.from(textSvg))
      .png()
      .toBuffer();

    // Уменьшаем логотип для компактности
    const maxLogoSize = Math.min(logoAreaHeight * 0.8, totalWidth * 0.4);
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

    // Собираем итоговое изображение на прозрачном фоне
    return await sharp(transparentBackground)
      .composite([
        {
          input: compactLogo,
          top: Math.round((logoAreaHeight - compactLogoHeight) / 2),
          left: Math.round((totalWidth - compactLogoWidth) / 2)
        },
        {
          input: textBuffer,
          top: logoAreaHeight + 20,
          left: 0
        }
      ])
      .png()
      .toBuffer();
  }

  // Функция для обрезки логотипа со всех сторон
  private async trimLogo(imageBuffer: Buffer, trimPercentage: number = 15): Promise<Buffer> {
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 300;
    const height = metadata.height || 300;
    
    // Рассчитываем размеры обрезки
    const trimWidth = Math.round(width * (trimPercentage / 100));
    const trimHeight = Math.round(height * (trimPercentage / 100));
    
    // Обрезаем изображение
    return await sharp(imageBuffer)
      .extract({
        left: trimWidth,
        top: trimHeight,
        width: width - (trimWidth * 2),
        height: height - (trimHeight * 2)
      })
      .png()
      .toBuffer();
  }

  // Сохранение буфера изображения в файл и возврат URL
  private async saveImageBuffer(buffer: Buffer, filename: string): Promise<string> {
    const publicDir = path.join(process.cwd(), '..', 'public', 'generated-logos');
    
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
  async generateLogoVariants(
    originalLogoUrl: string, 
    brandName: string, 
    brandColors: BrandColors, 
    brandFonts: BrandFont[]
  ): Promise<LogoVariant[]> {
    try {
      
      // Скачиваем оригинальное изображение
      const originalBuffer = await this.downloadImage(originalLogoUrl);
      
      // Создаем уникальные имена файлов
      const timestamp = Date.now();
      const sanitizedName = brandName.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // 1. Обрезаем оригинальный логотип
      const trimmedOriginalBuffer = await this.trimLogo(originalBuffer);
      const trimmedOriginalUrl = await this.saveImageBuffer(
        trimmedOriginalBuffer, 
        `${sanitizedName}_trimmed_${timestamp}.png`
      );
      
      // 2. Создаем монохромную версию и обрезаем её
      const monochromeBuffer = await this.createMonochromeVersion(originalBuffer);
      const trimmedMonochromeBuffer = await this.trimLogo(monochromeBuffer);
      const monochromeUrl = await this.saveImageBuffer(
        trimmedMonochromeBuffer, 
        `${sanitizedName}_monochrome_${timestamp}.png`
      );
      
      // 3. Создаем инвертированную версию и обрезаем её
      const invertedBuffer = await this.createInvertedVersion(originalBuffer);
      const trimmedInvertedBuffer = await this.trimLogo(invertedBuffer);
      const invertedUrl = await this.saveImageBuffer(
        trimmedInvertedBuffer, 
        `${sanitizedName}_inverted_${timestamp}.png`
      );
      
      // 4. Создаем логотип с полным названием в квадратном дизайне
      const abbreviationBuffer = await this.createAbbreviationLogo(brandName, brandColors, brandFonts);
      const abbreviationUrl = await this.saveImageBuffer(
        abbreviationBuffer, 
        `${sanitizedName}_abbreviation_${timestamp}.png`
      );
      
      // 5. Создаем логотип с текстом снизу без фона
      const logoWithTextBuffer = await this.createLogoWithTextBelow(trimmedOriginalBuffer, brandName, brandColors, brandFonts);
      const logoWithTextUrl = await this.saveImageBuffer(
        logoWithTextBuffer, 
        `${sanitizedName}_with_text_${timestamp}.png`
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
          name: 'Обрезанный логотип',
          url: trimmedOriginalUrl,
          description: 'Компактная версия логотипа с уменьшенными полями',
          type: 'trimmed',
          usage: 'Используется в случаях, когда требуется экономия пространства'
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
        },
        {
          name: 'Логотип-аббревиатура',
          url: abbreviationUrl,
          description: 'Стильный квадратный логотип с полным названием бренда',
          type: 'abbreviation',
          usage: 'Используется в качестве фавикона, в малых размерах, на соцсетях',
          text: brandName,
          font: brandFonts.find(font => font.type === 'primary')?.name || 'Inter'
        },
        {
          name: 'Логотип с названием',
          url: logoWithTextUrl,
          description: 'Прозрачная версия логотипа с названием бренда снизу',
          type: 'with_text',
          usage: 'Используется для презентаций, заголовков, на любых фонах',
          text: brandName,
          font: brandFonts.find(font => font.type === 'primary')?.name || 'Inter'
        }
      ];
      
      return logoVariants;
      
    } catch (error) {
      console.error('Error generating logo variants:', error);
      
      // Возвращаем базовые варианты если полная генерация не удалась
      return await this.generateBasicLogoVariants(originalLogoUrl, brandName);
    }
  }
}

// Экспорт экземпляра для переиспользования
export const logoVariantService = new LogoVariantService(); 