import { Router } from 'express';
import { getSupabaseClient } from '../index';
import { logoService } from '../services/logoService';

const router = Router();

// Маршрут для оплаты логотипа
router.post('/purchase-logo', async (req: any, res: any) => {
  try {
    const { orderId, name, keywords, logoUrl, userId, paymentMethod, email, phone } = req.body;

    // Валидация обязательных полей
    if (!orderId || !name || !keywords || !logoUrl || !userId || !email) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'Order ID, name, keywords, logo URL, user ID, and email are required'
      });
    }

    const supabase = getSupabaseClient();

    // Создаем чистый логотип без вотермарки
    const cleanLogoUrl = await logoService.generateCleanLogo(name, keywords);

    // Ищем существующий логотип с таким же URL
    const { data: existingLogo, error: findError } = await supabase
      .from('generated_logos')
      .select('*')
      .eq('user_id', userId)
      .eq('logo_url', logoUrl)
      .single();

    if (findError && findError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error finding existing logo:', findError);
      return res.status(500).json({ 
        error: 'Database error',
        message: 'Failed to find existing logo'
      });
    }

    let logoData;

    if (existingLogo) {
      // Обновляем существующий логотип
      const { data: updatedLogo, error: updateError } = await supabase
        .from('generated_logos')
        .update({
          logo_url: cleanLogoUrl, // Обновляем на версию без вотермарки
          original_logo_url: logoUrl, // Сохраняем оригинальный URL с вотермаркой
          is_paid: true,
          order_id: orderId,
          payment_method: paymentMethod,
          email: email,
          phone: phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLogo.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating logo:', updateError);
        return res.status(500).json({ 
          error: 'Database error',
          message: 'Failed to update logo information'
        });
      }

      logoData = updatedLogo;
    } else {
      // Создаем новый логотип (если по какой-то причине не нашли существующий)
      const { data: newLogo, error: insertError } = await supabase
        .from('generated_logos')
        .insert({
          user_id: userId,
          name: name,
          keywords: keywords,
          logo_url: cleanLogoUrl,
          original_logo_url: logoUrl,
          is_paid: true,
          order_id: orderId,
          payment_method: paymentMethod,
          email: email,
          phone: phone,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating paid logo:', insertError);
        return res.status(500).json({ 
          error: 'Database error',
          message: 'Failed to save logo information'
        });
      }

      logoData = newLogo;
    }

    // Отправляем email с логотипом (здесь можно добавить логику отправки email)
    // TODO: Implement email sending logic

    return res.status(200).json({ 
      success: true,
      message: 'Logo purchased successfully',
      logoId: logoData.id,
      cleanLogoUrl: cleanLogoUrl,
      orderId: orderId
    });

  } catch (error: any) {
    console.error('Error processing logo payment:', error);
    return res.status(500).json({ 
      error: 'Payment processing failed',
      message: error.message || 'An unknown error occurred'
    });
  }
});

export default router; 