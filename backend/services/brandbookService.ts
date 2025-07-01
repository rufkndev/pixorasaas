import axios from 'axios';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Интерфейс для ответа от GenAPI
export interface GeneratedResponse {
  request_id?: string;
  status?: string;
  result?: any;
  full_response?: any[];
  choices?: any[];
  output?: string;
  images?: string[];
  image_url?: string;
  url?: string;
  [key: string]: any;
}

// Интерфейс для брендбука
export interface Brandbook {
  slogan: string;
  colors: ColorPalette[];
  fonts: Font[];
  icons: BrandElement[];
  logoVariants: LogoVariant[];
}

export interface ColorPalette {
  name: string;
  hex: string;
  rgb: string;
  usage: string;
}

export interface Font {
  name: string;
  type: string;
  url: string;
  category: string;
}

export interface BrandElement {
  name: string;
  svg?: string;
  description: string;
  usage: string;
}

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

// Сервис для генерации брендбука
export class BrandbookService {
  private apiKey: string;
  private baseUrl = 'https://api.gen-api.ru/api/v1';

  constructor() {
    this.apiKey = process.env.GENAPI_KEY || '';
    if (!this.apiKey) {
      console.error('GENAPI_KEY is missing!');
    }
  }

  // Универсальная функция ожидания результата
  async waitForResult(requestId: string, maxAttempts: number = 20, delayMs: number = 1500): Promise<GeneratedResponse> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const statusUrl = `${this.baseUrl}/request/get/${requestId}`;
      
      const response = await axios.get(statusUrl, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });
      
      const status = response.data.status || response.data.state || 'processing';
      
      if (['success', 'done', 'completed', 'finished', 'ready'].includes(status.toLowerCase())) {
        return response.data;
      } 
      
      if (['failed', 'error', 'failure', 'rejected'].includes(status.toLowerCase())) {
        throw new Error(`GenAPI request failed: ${JSON.stringify(response.data)}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    throw new Error(`Timeout waiting for GenAPI result after ${maxAttempts} attempts`);
  }

  // Извлечение текста из ответа GenAPI
  extractTextFromResponse(response: GeneratedResponse): string {
    // Проверяем наиболее вероятные места расположения текста
    const textSources = [
      () => response.full_response?.[0]?.message?.content,
      () => response.result?.choices?.[0]?.message?.content,
      () => response.result?.text,
      () => typeof response.result === 'string' ? response.result : null,
      () => Array.isArray(response.result) ? response.result.join('\n') : null
    ];
    
    for (const getSource of textSources) {
      const text = getSource();
      if (text && typeof text === 'string') {
        return text;
      }
    }
    
    throw new Error(`Could not extract text from response: ${JSON.stringify(response)}`);
  }

  // Генерация слогана
  async generateSlogan(name: string, keywords: string, style: string): Promise<string> {
    const prompt = `Создай короткий и запоминающийся рекламный слоган для бренда "${name}". 
    Сфера деятельности и ключевые характеристики бизнеса: ${keywords}.
    Стиль бренда: ${style}.
    Слоган должен быть кратким (до 7 слов), легко запоминаться и вызывать положительные эмоции.
    Учитывай название "${name}" и делай слоган уникальным для этого бизнеса.
    Верни только текст слогана без кавычек и пояснений.`;

    const initialResponse = await axios.post(`${this.baseUrl}/networks/gpt-4o`, {
      messages: [
        {
          role: "system",
          content: "Ты - креативный копирайтер и эксперт по маркетингу. Твоя задача - создать уникальный, короткий и запоминающийся слоган, который идеально подходит конкретному бренду."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 60
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      timeout: 30000
    });

    const completedResponse = await this.waitForResult(initialResponse.data.request_id);
    let slogan = this.extractTextFromResponse(completedResponse);
    
    // Убираем кавычки если есть
    slogan = slogan.replace(/^["']|["']$/g, '');
    
    return slogan.trim();
  }

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

  // Генерация вариаций логотипа
  async generateLogoVariants(originalLogoUrl: string, brandName: string): Promise<LogoVariant[]> {
    try {
      console.log(`Generating logo variants for: ${brandName}`);
      
      // Скачиваем оригинальное изображение
      const originalBuffer = await this.downloadImage(originalLogoUrl);
      
      // Создаем уникальные имена файлов
      const timestamp = Date.now();
      const sanitizedName = brandName.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Создаем монохромную версию
      const monochromeBuffer = await this.createMonochromeVersion(originalBuffer);
      const monochromeUrl = await this.saveImageBuffer(
        monochromeBuffer, 
        `${sanitizedName}_monochrome_${timestamp}.png`
      );
      
      // Создаем инвертированную версию
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
      
      console.log(`Generated ${logoVariants.length} logo variants`);
      return logoVariants;
      
    } catch (error) {
      console.error('Error generating logo variants:', error);
      
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

  // Генерация полного брендбука
  async generateBrandbook(name: string, keywords: string, logoUrl: string): Promise<Partial<Brandbook>> {
    console.log(`Starting brandbook generation for: ${name}`);
    
    // Генерируем слоган
    const slogan = await this.generateSlogan(name, keywords, 'профессиональный и современный');
    
    // Генерируем вариации логотипа
    const logoVariants = await this.generateLogoVariants(logoUrl, name);
    
    // В будущем здесь будет генерация других элементов брендбука
    const brandbook: Partial<Brandbook> = {
      slogan: slogan,
      colors: [], // TODO: Генерация цветовой палитры
      fonts: [], // TODO: Подбор шрифтов
      icons: [], // TODO: Генерация иконок
      logoVariants: logoVariants
    };

    console.log('Brandbook generation completed:', { 
      slogan, 
      logoVariantsCount: logoVariants.length 
    });
    
    return brandbook;
  }
}

// Ленивая инициализация
let brandbookServiceInstance: BrandbookService | null = null;

export const getBrandbookService = (): BrandbookService => {
  if (!brandbookServiceInstance) {
    brandbookServiceInstance = new BrandbookService();
  }
  return brandbookServiceInstance;
};

// Экспорт для удобства использования
export const brandbookService = {
  generateSlogan: (name: string, keywords: string, style: string) => 
    getBrandbookService().generateSlogan(name, keywords, style),
  generateBrandbook: (name: string, keywords: string, logoUrl: string) => 
    getBrandbookService().generateBrandbook(name, keywords, logoUrl),
  generateLogoVariants: (originalLogoUrl: string, brandName: string) => 
    getBrandbookService().generateLogoVariants(originalLogoUrl, brandName)
};
