// Этот файл содержит:
// - Синглтон для клиента Supabase (паттерн, обеспечивающий единственный экземпляр класса)
// - Проверку наличия необходимых переменных окружения (настроек подключения)

// Импортируем необходимые типы и функции из библиотеки Supabase
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Глобальная переменная для хранения единственного экземпляра клиента Supabase
// null по умолчанию, будет инициализирована при первом вызове createSupabaseClient
let supabaseInstance: SupabaseClient | null = null;

// Создает или возвращает существующий экземпляр клиента Supabase
// Реализует паттерн синглтон для предотвращения создания множественных экземпляров
export const createSupabaseClient = () => {
  // Проверяем, существует ли уже экземпляр клиента
  // Если да - возвращаем его, чтобы не создавать новый
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // Получаем настройки подключения из переменных окружения
  // NEXT_PUBLIC_ в начале означает, что эти переменные доступны на клиенте
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;     // URL вашей базы данных Supabase
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Публичный ключ для анонимного доступа

  // Проверяем наличие обязательных настроек
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL and key must be provided');
  }

  // Создаем новый экземпляр клиента с настройками
  supabaseInstance = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,      // Сохранять сессию между перезагрузками страницы
      storageKey: 'pixora-auth-storage', // Ключ для хранения данных аутентификации в localStorage
      autoRefreshToken: true,    // Автоматически обновлять токен аутентификации
      debug: false               // Отключаем режим отладки (не выводить логи в консоль)
    }
  });

  return supabaseInstance;
};

//Сбрасывает экземпляр клиента Supabase
export const resetSupabaseClient = () => {
  supabaseInstance = null;
}; 