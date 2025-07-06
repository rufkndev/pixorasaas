import axios from 'axios';
import { apiUtils } from '../../utils/apiUtils';

// Сервис для генерации слоганов
export class SloganService {
  // Генерация слогана
  async generateSlogan(name: string, keywords: string, style: string): Promise<string> {
    const prompt = `Создай короткий и запоминающийся рекламный слоган для бренда "${name}". 
    Сфера деятельности и ключевые характеристики бизнеса: ${keywords}.
    Стиль бренда: ${style}.
    Слоган должен быть кратким (до 7 слов), легко запоминаться и вызывать положительные эмоции.
    Учитывай название "${name}" и делай слоган уникальным для этого бизнеса.
    Верни только текст слогана без кавычек и пояснений.`;

    const initialResponse = await axios.post(`${apiUtils.getBaseUrl()}/networks/gpt-4o`, {
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
        'Authorization': `Bearer ${apiUtils.getApiKey()}`
      },
      timeout: 30000
    });

    const completedResponse = await apiUtils.waitForResult(initialResponse.data.request_id);
    let slogan = apiUtils.extractTextFromResponse(completedResponse);
    
    // Убираем кавычки если есть
    slogan = slogan.replace(/^["']|["']$/g, '');
    
    return slogan.trim();
  }
}

// Экспорт экземпляра для переиспользования
export const sloganService = new SloganService(); 