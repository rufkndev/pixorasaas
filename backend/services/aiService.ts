import axios from 'axios';

// Интерфейсы для типизации
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

// Основные функции для работы с GenAPI
export class AIService {
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
      try {
        const statusUrl = `${this.baseUrl}/request/get/${requestId}`;
        console.log(`Checking request status (attempt ${attempt + 1}/${maxAttempts}): ${statusUrl}`);
        
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
      } catch (error: any) {
        console.error(`Error checking request status (attempt ${attempt + 1}):`, error.message);
        
        if (attempt === maxAttempts - 1) {
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
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

  // Генерация названий компаний
  async generateNames(industry: string, keywords: string, style: string, preferences?: string): Promise<string[]> {
    const prompt = `Сгенерируй 6 уникальных и креативных названий для бизнеса в нише "${industry}". 
    Используй следующие ключевые слова: ${keywords}. 
    Стиль названий должен быть: ${style}. 
    Дополнительные пожелания: ${preferences || 'нет'}. 
    Названия должны быть краткими, запоминающимися и уникальными. 
    Верни только список названий, каждое название с новой строки, без нумерации и дополнительных пояснений.`;

    const initialResponse = await axios.post(`${this.baseUrl}/networks/gpt-4o`, {
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 200
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!initialResponse.data.request_id) {
      throw new Error('No request_id in response');
    }

    const completedResponse = await this.waitForResult(initialResponse.data.request_id);
    const generatedText = this.extractTextFromResponse(completedResponse);
    
    const generatedNames = generatedText
      .split('\n')
      .map(name => name.trim())
      .filter(name => name.length > 0);

    if (generatedNames.length === 0) {
      throw new Error('No names were generated');
    }

    return generatedNames;
  }

  // Генерация логотипа
  async generateLogo(businessName: string, keywords: string): Promise<string> {
    const prompt = this.createLogoPrompt(businessName, keywords);
    
    const initialResponse = await axios.post(`${this.baseUrl}/networks/dalle-3`, {
      prompt: prompt,
      size: "1024x1024",
      quality: "hd"
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      }
    });
    
    if (!initialResponse.data?.request_id) {
      throw new Error('Invalid response from GenAPI: missing request_id');
    }
    
    // Используем больше попыток для генерации изображений (они дольше обрабатываются)
    const generationResult = await this.waitForResult(initialResponse.data.request_id, 120, 5000);
    const logoUrl = this.extractLogoUrl(generationResult);
    
    if (!logoUrl) {
      throw new Error('Logo URL not found in API response');
    }
    
    return logoUrl;
  }

  // Генерация слогана
  async generateSlogan(name: string, keywords: string, style: string): Promise<string> {
    try {
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

      if (!initialResponse.data.request_id) {
        return `Инновационные решения от ${name}`;
      }

      const completedResponse = await this.waitForResult(initialResponse.data.request_id);
      let slogan = this.extractTextFromResponse(completedResponse);
      
      // Убираем кавычки если есть
      slogan = slogan.replace(/^["']|["']$/g, '');
      
      return slogan.length >= 3 ? slogan : `Инновационные решения от ${name}`;
    } catch (error) {
      console.error('Error generating slogan:', error);
      return `Инновационные решения от ${name}`;
    }
  }

  // Создание промпта для логотипа
  private createLogoPrompt(name: string, keywords: string): string {
    const formattedKeywords = keywords.split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0)
      .join(', ');
    
    return `Create a professional, minimalist logo for a business named "${name}" that specializes in ${formattedKeywords}. 
The logo should be:
- Clean, modern, and visually striking
- Suitable for both digital and print media
- Memorable and instantly recognizable
- Using a sophisticated color palette that reflects the business essence
- Without any text or typography
- With clever use of negative space and geometric shapes
- Balanced composition with strong visual hierarchy
- Simple enough to be recognizable at small sizes

The logo should capture the essence of ${formattedKeywords} while maintaining a timeless, professional aesthetic. Create the logo against a clean white background in a square format.`;
  }

  // Извлечение URL логотипа из ответа
  private extractLogoUrl(response: GeneratedResponse): string | null {
    // Проверяем прямые свойства
    const directUrls = [
      response.output,
      response.result?.output,
      response.result?.images?.[0],
      response.images?.[0],
      response.image_url,
      response.url
    ];
    
    for (const url of directUrls) {
      if (url && this.isImageUrl(url)) {
        return url;
      }
    }
    
    // Рекурсивный поиск
    return this.findImageUrl(response);
  }

  // Проверка, является ли строка URL изображения
  private isImageUrl(value: any): boolean {
    if (typeof value !== 'string') return false;
    return value.startsWith('http') && 
           (value.endsWith('.png') || 
            value.endsWith('.jpg') || 
            value.endsWith('.jpeg') || 
            value.endsWith('.webp') || 
            value.endsWith('.gif') || 
            value.includes('images.gen-api.ru'));
  }

  // Рекурсивный поиск URL изображения
  private findImageUrl(obj: any, depth: number = 0): string | null {
    if (depth > 5 || !obj || typeof obj !== 'object') return null;
    
    // Проверяем известные ключи
    const knownKeys = ['output', 'url', 'image_url', 'image', 'img', 'src', 'source', 'link'];
    for (const key of knownKeys) {
      if (obj[key] && this.isImageUrl(obj[key])) {
        return obj[key];
      }
    }
    
    // Проверяем массивы
    const arrayKeys = ['images', 'outputs', 'results', 'data'];
    for (const key of arrayKeys) {
      if (Array.isArray(obj[key])) {
        for (const item of obj[key]) {
          if (this.isImageUrl(item)) {
            return item;
          }
          if (typeof item === 'object' && item !== null) {
            const nestedUrl = this.findImageUrl(item, depth + 1);
            if (nestedUrl) return nestedUrl;
          }
        }
      }
    }
    
    // Проверяем все остальные свойства
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        const nestedUrl = this.findImageUrl(obj[key], depth + 1);
        if (nestedUrl) return nestedUrl;
      }
    }
    
    return null;
  }
}


// Ленивая инициализация - создаем экземпляр только при первом вызове
let aiServiceInstance: AIService | null = null;

export const getAIService = (): AIService => {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();
  }
  return aiServiceInstance;
};

// Для обратной совместимости
export const aiService = {
  generateNames: (industry: string, keywords: string, style: string, preferences?: string) => 
    getAIService().generateNames(industry, keywords, style, preferences),
  generateLogo: (businessName: string, keywords: string) => 
    getAIService().generateLogo(businessName, keywords),
  generateSlogan: (name: string, keywords: string, style: string) => 
    getAIService().generateSlogan(name, keywords, style)
}; 