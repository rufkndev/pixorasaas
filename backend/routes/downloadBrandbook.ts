import { Router } from 'express';
import { getSupabaseClient } from '../index';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

// Функция для валидации и очистки HTML контента
const validateHtmlContent = (htmlContent: string): string => {
  if (!htmlContent || typeof htmlContent !== 'string') {
    return '<div>Invalid HTML content</div>';
  }
  
  // Основная валидация
  let validatedHtml = htmlContent;
  
  // Проверяем на XSS и потенциально опасные теги
  if (validatedHtml.includes('<script') || validatedHtml.includes('<iframe') || validatedHtml.includes('javascript:')) {
    console.warn('Potentially dangerous HTML detected, sanitizing...');
    validatedHtml = validatedHtml.replace(/<script[^>]*>.*?<\/script>/gi, '');
    validatedHtml = validatedHtml.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
    validatedHtml = validatedHtml.replace(/javascript:/gi, '');
  }
  
  // Проверяем на корректность XML/HTML структуры
  const openTags = validatedHtml.match(/<([a-z][a-z0-9]*)\b[^>]*>/gi) || [];
  const closeTags = validatedHtml.match(/<\/([a-z][a-z0-9]*)\s*>/gi) || [];
  
  if (openTags.length !== closeTags.length) {
    console.warn('HTML has mismatched tags, applying fixes...');
    // Простое исправление - удаляем некорректные теги
    for (const tag of ['<img', '<br', '<hr', '<input', '<meta', '<link']) {
      validatedHtml = validatedHtml.replace(new RegExp(`${tag}([^>]*?)>`, 'gi'), (match) => {
        if (!match.includes('/>')) {
          return match.replace('>', ' />');
        }
        return match;
      });
    }
  }
  
  return validatedHtml;
};

// Функция для конвертации HTML в SVG
const convertHtmlToSvg = (htmlContent: string, width: number, height: number): string => {
  // Валидируем HTML контент
  const validatedHtml = validateHtmlContent(htmlContent);
  
  // Очищаем HTML от лишних переносов строк
  let cleanedHtml = validatedHtml
    .replace(/\n\s*/g, ' ')  // Заменяем переносы строк на пробелы
    .replace(/\s+/g, ' ')    // Убираем множественные пробелы
    .trim();
  
  // Исправляем проблемы с тегами img
  cleanedHtml = cleanedHtml
    // Заменяем <img> теги на div с фоновым текстом или заглушкой
    .replace(/<img[^>]*src="([^"]*)"[^>]*>/g, '<div style="width: 50px; height: 50px; background: #e2e8f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; color: #475569;">LOGO</div>')
    // Удаляем все некорректные img теги
    .replace(/<img[^>]*>/g, '<div style="width: 50px; height: 50px; background: #e2e8f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; color: #475569;">LOGO</div>')
    // Убираем потенциально проблематичные атрибуты
    .replace(/\s+style="[^"]*"/g, (match) => {
      // Убираем свойства, которые могут вызвать проблемы в SVG
      return match.replace(/transform:[^;]*;?/g, '').replace(/filter:[^;]*;?/g, '');
    })
    // Исправляем двойные кавычки внутри атрибутов
    .replace(/([a-zA-Z-]+)="([^"]*(?:""[^"]*)*)"([^>]*>)/g, (match, attr, value, rest) => {
      return `${attr}="${value.replace(/"/g, "'")}"${rest}`;
    });
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <defs>
    <style>
      <![CDATA[
      .html-content {
        font-family: Arial, sans-serif;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        overflow: hidden;
      }
      ]]>
    </style>
  </defs>
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" class="html-content">
      ${cleanedHtml}
    </div>
  </foreignObject>
</svg>`;
};



const router = Router();



// Endpoint для скачивания вариаций логотипов
router.get('/download-logo-variants/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { userId, format } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const supabase = getSupabaseClient();
    
    // Получаем данные брендбука
    const { data: brandbook, error } = await supabase
      .from('brandbooks')
      .select('*')
      .eq('order_id', orderId)
      .eq('user_id', userId)
      .single();

    if (error || !brandbook) {
      return res.status(404).json({ error: 'Brandbook not found' });
    }

    // Создаем ZIP архив
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    res.attachment(`${brandbook.business_name}_logo_variants.zip`);
    res.setHeader('Content-Type', 'application/zip');
    
    archive.pipe(res);

    // Добавляем вариации логотипов в архив
    for (const variant of brandbook.logo_variants || []) {
      try {
        const logoPath = path.join(process.cwd(), 'public', variant.url);
        
        if (fs.existsSync(logoPath)) {
          const logoBuffer = fs.readFileSync(logoPath);
          const filename = `${variant.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
          
          // Добавляем PNG файл
          archive.append(logoBuffer, { name: `png/${filename}` });
        }
      } catch (error) {
        console.error('Error processing variant:', error);
      }
    }

    archive.finalize();
    
  } catch (error) {
    console.error('Error downloading logo variants:', error);
    res.status(500).json({ error: 'Failed to download logo variants' });
  }
});

// Endpoint для скачивания иконок и элементов
router.get('/download-icons/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const supabase = getSupabaseClient();
    
    // Получаем данные брендбука
    const { data: brandbook, error } = await supabase
      .from('brandbooks')
      .select('*')
      .eq('order_id', orderId)
      .eq('user_id', userId)
      .single();

    if (error || !brandbook) {
      return res.status(404).json({ error: 'Brandbook not found' });
    }

    // Создаем ZIP архив
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    res.attachment(`${brandbook.business_name}_icons.zip`);
    res.setHeader('Content-Type', 'application/zip');
    
    archive.pipe(res);

    console.log(`Processing ${brandbook.icons?.length || 0} icons for download`);
    
    // Добавляем иконки в архив
    for (const icon of brandbook.icons || []) {
      try {
        const iconName = icon.name.replace(/[^a-zA-Z0-9]/g, '_');
        console.log(`Processing icon: ${icon.name} (${iconName})`);
        
        // Если есть SVG код, сохраняем его
        if (icon.svg) {
          console.log(`Icon ${iconName} has SVG content: ${icon.svg.substring(0, 100)}...`);
          
          // Проверяем что SVG содержит корректные данные
          let svgContent = icon.svg;
          if (!svgContent.includes('<svg') || svgContent.trim().length < 10) {
            console.log(`Icon ${iconName} has invalid SVG, creating fallback`);
            // Создаем fallback SVG если оригинальный некорректный
            svgContent = `<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
              <circle cx="32" cy="32" r="28" fill="#2563eb" opacity="0.1"/>
              <circle cx="32" cy="32" r="20" fill="#2563eb" opacity="0.2"/>
              <circle cx="32" cy="32" r="12" fill="#2563eb"/>
              <text x="32" y="36" text-anchor="middle" fill="white" font-size="8" font-weight="bold">${icon.name.charAt(0).toUpperCase()}</text>
            </svg>`;
          }
          
          const svgBuffer = Buffer.from(svgContent);
          archive.append(svgBuffer, { name: `svg/${iconName}.svg` });
          
          // Не конвертируем в PNG, только SVG
        } else {
          // Если SVG отсутствует, создаем fallback иконку
          const fallbackSvg = `<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="28" fill="#2563eb" opacity="0.1"/>
            <circle cx="32" cy="32" r="20" fill="#2563eb" opacity="0.2"/>
            <circle cx="32" cy="32" r="12" fill="#2563eb"/>
            <text x="32" y="36" text-anchor="middle" fill="white" font-size="8" font-weight="bold">${(icon.name || 'I').charAt(0).toUpperCase()}</text>
          </svg>`;
          
          const svgBuffer = Buffer.from(fallbackSvg);
          archive.append(svgBuffer, { name: `svg/${iconName}.svg` });
          
          // Не конвертируем в PNG, только SVG
        }
      } catch (error) {
        console.error('Error processing icon:', error);
      }
    }

    archive.finalize();
    
  } catch (error) {
    console.error('Error downloading icons:', error);
    res.status(500).json({ error: 'Failed to download icons' });
  }
});

// Endpoint для скачивания макетов применения
router.get('/download-applications/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const supabase = getSupabaseClient();
    
    // Получаем данные брендбука
    const { data: brandbook, error } = await supabase
      .from('brandbooks')
      .select('*')
      .eq('order_id', orderId)
      .eq('user_id', userId)
      .single();

    if (error || !brandbook) {
      return res.status(404).json({ error: 'Brandbook not found' });
    }

    // Создаем ZIP архив
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    res.attachment(`${brandbook.business_name}_applications.zip`);
    res.setHeader('Content-Type', 'application/zip');
    
    archive.pipe(res);

    const applications = brandbook.applications || {};
    console.log(`Processing ${Object.keys(applications).length} application types:`, Object.keys(applications));

    const templateSizes = {
      businessCard: { width: 400, height: 200 },
      presentationCover: { width: 800, height: 800 },
      presentationSlide: { width: 900, height: 600 },
      socialPost: { width: 550, height: 400 },
      socialStory: { width: 400, height: 500 },
      socialCover: { width: 750, height: 300 },
      emailSignature: { width: 550, height: 300 }
    };

    // Конвертируем HTML шаблоны в SVG для скачивания
    for (const [appType, appData] of Object.entries(applications)) {
      try {
        console.log(`Processing application: ${appType}`);
        const typedAppData = appData as any;
        
        if (appType === 'businessCard' && typedAppData.template) {
          // Конвертируем HTML в правильный SVG (адаптивная визитка)
          const svgContent = convertHtmlToSvg(typedAppData.template, templateSizes.businessCard.width, templateSizes.businessCard.height);
          const svgBuffer = Buffer.from(svgContent);
          archive.append(svgBuffer, { name: `business_card.svg` });
        }
        
        if (appType === 'presentation' && typedAppData.coverTemplate) {
          // Конвертируем HTML в правильный SVG (обложка презентации)
          const svgContent = convertHtmlToSvg(typedAppData.coverTemplate, templateSizes.presentationCover.width, templateSizes.presentationCover.height);
          const svgBuffer = Buffer.from(svgContent);
          archive.append(svgBuffer, { name: `presentation_cover.svg` });
        }
        
        if (appType === 'presentation' && typedAppData.slideTemplate) {
          // Конвертируем HTML в правильный SVG (слайд презентации)
          const svgContent = convertHtmlToSvg(typedAppData.slideTemplate, templateSizes.presentationSlide.width, templateSizes.presentationSlide.height);
          const svgBuffer = Buffer.from(svgContent);
          archive.append(svgBuffer, { name: `presentation_slide.svg` });
        }
        
        if (appType === 'socialMedia' && typedAppData.templates) {
          for (const [templateType, templateSvg] of Object.entries(typedAppData.templates)) {
            if (templateSvg && typeof templateSvg === 'string') {
              // Определяем размеры для разных типов шаблонов
              let width = templateSizes.socialPost.width, height = templateSizes.socialPost.height; // пост
              if (templateType === 'story') {
                width = templateSizes.socialStory.width;
                height = templateSizes.socialStory.height;
              } else if (templateType === 'cover') {
                width = templateSizes.socialCover.width;
                height = templateSizes.socialCover.height;
              }
              
              // Конвертируем HTML в правильный SVG
              const svgContent = convertHtmlToSvg(templateSvg, width, height);
              const svgBuffer = Buffer.from(svgContent);
              archive.append(svgBuffer, { name: `social_media_${templateType}.svg` });
            }
          }
        }
        
        if (appType === 'emailSignature' && typedAppData.template) {
          // Конвертируем HTML в правильный SVG (email подпись адаптивная)
          const svgContent = convertHtmlToSvg(typedAppData.template, templateSizes.emailSignature.width, templateSizes.emailSignature.height);
          const svgBuffer = Buffer.from(svgContent);
          archive.append(svgBuffer, { name: `email_signature.svg` });
        }
        
      } catch (error) {
        console.error(`Error processing application ${appType}:`, error);
      }
    }

    archive.finalize();
    
  } catch (error) {
    console.error('Error downloading applications:', error);
    res.status(500).json({ error: 'Failed to download applications' });
  }
});

export default router; 