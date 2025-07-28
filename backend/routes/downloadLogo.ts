import { Router } from 'express';
import { getSupabaseClient } from '../index';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const router = Router();

// Endpoint для скачивания логотипа без вотермарки
router.get('/download-logo/:logoId', async (req, res) => {
  try {
    const { logoId } = req.params;
    const { userId, format = 'png' } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    const supabase = getSupabaseClient();
    
    // Получаем данные логотипа
    const { data: logo, error } = await supabase
      .from('generated_logos')
      .select('*')
      .eq('id', logoId)
      .eq('user_id', userId)
      .single();

    if (error || !logo) {
      return res.status(404).json({ error: 'Logo not found' });
    }

    // Проверяем статус оплаты
    if (!logo.is_paid) {
      return res.status(403).json({ 
        error: 'Payment required',
        message: 'Для скачивания логотипа требуется оплата'
      });
    }

    // Получаем путь к файлу логотипа
    const logoPath = logo.logo_url.replace('/generated-logos/', '');
    const fullLogoPath = path.join(process.cwd(), '..', 'public', 'generated-logos', logoPath);

    // Проверяем существование файла
    if (!fs.existsSync(fullLogoPath)) {
      return res.status(404).json({ error: 'Logo file not found' });
    }

    // Читаем файл
    const logoBuffer = fs.readFileSync(fullLogoPath);
    
    // Определяем имя файла для скачивания
    const fileName = `${logo.name.replace(/[^a-zA-Z0-9]/g, '_')}_logo`;
    
    // Если запрошен определенный формат, конвертируем
    let outputBuffer = logoBuffer;
    let mimeType = 'image/png';
    let fileExtension = 'png';

    if (format === 'svg' && fullLogoPath.endsWith('.svg')) {
      mimeType = 'image/svg+xml';
      fileExtension = 'svg';
    } else if (format === 'jpg' || format === 'jpeg') {
      outputBuffer = Buffer.from(await sharp(logoBuffer)
        .jpeg({ quality: 95 })
        .toBuffer());
      mimeType = 'image/jpeg';
      fileExtension = 'jpg';
    } else if (format === 'webp') {
      outputBuffer = Buffer.from(await sharp(logoBuffer)
        .webp({ quality: 95 })
        .toBuffer());
      mimeType = 'image/webp';
      fileExtension = 'webp';
    } else {
      // По умолчанию PNG
      if (!fullLogoPath.endsWith('.png')) {
        outputBuffer = Buffer.from(await sharp(logoBuffer)
          .png({ quality: 95 })
          .toBuffer());
      }
      mimeType = 'image/png';
      fileExtension = 'png';
    }

    // Отправляем файл
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}.${fileExtension}"`);
    res.send(outputBuffer);

  } catch (error) {
    console.error('Error downloading logo:', error);
    res.status(500).json({ error: 'Failed to download logo' });
  }
});

// Endpoint для получения списка логотипов пользователя
router.get('/user-logos/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const supabase = getSupabaseClient();
    
    // Получаем все логотипы пользователя
    const { data: logos, error } = await supabase
      .from('generated_logos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user logos:', error);
      return res.status(500).json({ error: 'Failed to fetch logos' });
    }

    // Возвращаем логотипы с информацией о статусе оплаты
    const logosWithStatus = logos.map(logo => ({
      id: logo.id,
      name: logo.name,
      keywords: logo.keywords,
      logo_url: logo.logo_url,
      is_paid: logo.is_paid,
      payment_id: logo.payment_id,
      created_at: logo.created_at,
      // Не передаем приватную информацию
    }));

    return res.status(200).json({ 
      success: true,
      logos: logosWithStatus 
    });

  } catch (error) {
    console.error('Error fetching user logos:', error);
    res.status(500).json({ error: 'Failed to fetch user logos' });
  }
});

// Endpoint для предпросмотра логотипа (с вотермаркой для неоплаченных)
router.get('/preview-logo/:logoId', async (req, res) => {
  try {
    const { logoId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    const supabase = getSupabaseClient();
    
    // Получаем данные логотипа
    const { data: logo, error } = await supabase
      .from('generated_logos')
      .select('*')
      .eq('id', logoId)
      .eq('user_id', userId)
      .single();

    if (error || !logo) {
      return res.status(404).json({ error: 'Logo not found' });
    }

    // Возвращаем URL логотипа (с вотермаркой если не оплачен)
    return res.status(200).json({ 
      success: true,
      logo: {
        id: logo.id,
        name: logo.name,
        logo_url: logo.logo_url,
        is_paid: logo.is_paid,
        created_at: logo.created_at
      }
    });

  } catch (error) {
    console.error('Error previewing logo:', error);
    res.status(500).json({ error: 'Failed to preview logo' });
  }
});

export default router; 