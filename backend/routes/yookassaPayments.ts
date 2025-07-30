import { Router } from 'express';
import { yookassaService } from '../services/yookassaService';
import { getSupabaseClient } from '../index';
import { logoService } from '../services/logoService';
import { brandbookService } from '../services/brandbookServices';

const router = Router();

// Тестовый роут для диагностики проблем с ЮKassa
router.post('/yookassa/test-payment', async (req: any, res: any) => {
  try {
    console.log('Testing YooKassa with minimal data...');
    
    // Минимальный тестовый платеж
    const payment = await yookassaService.createPayment({
      amount: 100,
      description: 'Тестовый платеж',
      returnUrl: 'https://www.pixora-labs.ru/pages/payment/success?test=true',
      customerEmail: 'test@example.com'
    });

    return res.status(201).json({
      success: true,
      message: 'Test payment created successfully',
      payment: {
        id: payment.id,
        status: payment.status,
        confirmation_url: payment.confirmation.confirmation_url
      }
    });

  } catch (error: any) {
    console.error('Test payment failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Создание платежа
router.post('/yookassa/create-payment', async (req: any, res: any) => {
  try {
    const { 
      amount, 
      description, 
      metadata, 
      returnUrl,
      productType, // 'logo' или 'brandbook'
      productData // данные продукта
    } = req.body;

    // Валидация
    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        error: 'Invalid amount',
        message: 'Amount must be greater than 0'
      });
    }

    if (!returnUrl) {
      return res.status(400).json({ 
        error: 'Missing returnUrl',
        message: 'Return URL is required'
      });
    }

    if (!productType || !['logo', 'brandbook'].includes(productType)) {
      return res.status(400).json({ 
        error: 'Invalid productType',
        message: 'Product type must be "logo" or "brandbook"'
      });
    }

    if (!productData) {
      return res.status(400).json({ 
        error: 'Missing productData',
        message: 'Product data is required'
      });
    }

    if (!productData.email) {
      return res.status(400).json({ 
        error: 'Missing email',
        message: 'Customer email is required for receipt generation (54-ФЗ compliance)'
      });
    }

    // Создаем платеж в ЮKassa с минимальными метаданными
    const payment = await yookassaService.createPayment({
      amount: amount,
      description: description || `Оплата ${productType === 'logo' ? 'логотипа' : 'брендбука'}`,
      returnUrl: returnUrl,
      customerEmail: productData.email,
      customerPhone: productData.phone,
      metadata: {
        productType: productType,
        userId: productData.userId,
        name: productData.name,
        orderId: `order_${Date.now()}`
      }
    });

    // Сохраняем информацию о платеже в базу данных
    const supabase = getSupabaseClient();
    
    const { data: savedPayment, error: saveError } = await supabase
      .from('payments')
      .insert({
        yookassa_payment_id: payment.id,
        user_id: productData.userId,
        product_type: productType,
        amount: parseFloat(payment.amount.value),
        currency: payment.amount.currency,
        status: payment.status,
        product_data: productData,
        description: payment.description,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving payment to database:', saveError);
      // Платеж уже создан в ЮKassa, но не сохранен в нашей БД
      // В продакшене здесь нужно логирование для ручной обработки
    }

    return res.status(201).json({
      success: true,
      payment: {
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        confirmation_url: payment.confirmation.confirmation_url,
        created_at: payment.created_at
      }
    });

  } catch (error: any) {
    console.error('Error creating YooKassa payment:', error);
    return res.status(500).json({
      error: 'Payment creation failed',
      message: error.message || 'Неизвестная ошибка при создании платежа'
    });
  }
});

// Проверка статуса платежа
router.get('/yookassa/payment/:paymentId', async (req: any, res: any) => {
  try {
    const { paymentId } = req.params;
    const { userId } = req.query;

    if (!paymentId) {
      return res.status(400).json({ 
        error: 'Payment ID is required' 
      });
    }

    // Получаем информацию о платеже из ЮKassa
    const payment = await yookassaService.getPayment(paymentId);
    
    // Проверяем наличие платежа в нашей БД
    const supabase = getSupabaseClient();
    
    let whereClause = supabase
      .from('payments')
      .select('*')
      .eq('yookassa_payment_id', paymentId);
    
    if (userId) {
      whereClause = whereClause.eq('user_id', userId);
    }
    
    const { data: localPayment, error: fetchError } = await whereClause.single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching local payment:', fetchError);
    }

    return res.status(200).json({
      success: true,
      payment: {
        id: payment.id,
        status: payment.status,
        paid: payment.paid,
        amount: payment.amount,
        created_at: payment.created_at,
        description: payment.description,
        metadata: payment.metadata,
        local_payment: localPayment
      }
    });

  } catch (error: any) {
    console.error('Error fetching YooKassa payment:', error);
    return res.status(500).json({
      error: 'Failed to fetch payment',
      message: error.message || 'Неизвестная ошибка при получении платежа'
    });
  }
});

// Webhook для уведомлений от ЮKassa
router.post('/yookassa/webhook', async (req: any, res: any) => {
  try {
    const signature = req.headers['x-yookassa-signature'] || req.headers['x-yoomoney-signature'];
    const body = JSON.stringify(req.body);
    
    console.log('Received YooKassa webhook:', {
      event: req.body.event,
      paymentId: req.body.object?.id,
      hasSignature: !!signature
    });
    
    // Проверяем подпись (если настроена)
    if (!yookassaService.verifyWebhookSignature(body, signature)) {
      console.error('Invalid YooKassa webhook signature');
      // Не блокируем обработку, только логируем
    }

    const webhookData = req.body;
    
    // Обрабатываем webhook
    const result = await yookassaService.processWebhook(webhookData);
    
    if (!result.success) {
      console.error('Failed to process webhook:', result.error);
      return res.status(400).json({ error: result.error });
    }

    // Если платеж успешно завершен, создаем продукт
    if (result.paymentData && result.paymentData.status === 'succeeded') {
      await processSuccessfulPayment(result.paymentData);
    }

    return res.status(200).json({ success: true });

  } catch (error: any) {
    console.error('Error processing YooKassa webhook:', error);
    return res.status(500).json({
      error: 'Webhook processing failed',
      message: error.message
    });
  }
});

// Обработка успешного платежа
async function processSuccessfulPayment(payment: any) {
  const supabase = getSupabaseClient();
  
  try {
    // Обновляем статус платежа в нашей БД
    const { data: localPayment, error: updateError } = await supabase
      .from('payments')
      .update({ 
        status: 'succeeded',
        paid_at: new Date().toISOString()
      })
      .eq('yookassa_payment_id', payment.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating local payment status:', updateError);
      return;
    }

    if (!localPayment) {
      console.error('Local payment not found for YooKassa payment:', payment.id);
      return;
    }

    const { product_type, product_data } = localPayment;

    if (product_type === 'logo') {
      await processLogoPayment(localPayment);
    } else if (product_type === 'brandbook') {
      await processBrandbookPayment(localPayment);
    }

  } catch (error) {
    console.error('Error processing successful payment:', error);
  }
}

// Обработка оплаты логотипа
async function processLogoPayment(paymentData: any) {
  const supabase = getSupabaseClient();
  const { user_id, product_data, yookassa_payment_id } = paymentData;
  const { name, keywords, logoUrl, email, phone } = product_data;

  try {
    // Ищем существующий логотип или создаем новый
    const { data: existingLogo, error: findError } = await supabase
      .from('generated_logos')
      .select('*')
      .eq('user_id', user_id)
      .eq('logo_url', logoUrl)
      .single();

    let logoData;

    if (existingLogo) {
      // Обновляем существующий логотип
      const { data: updatedLogo, error: updateError } = await supabase
        .from('generated_logos')
        .update({
          is_paid: true,
          payment_id: yookassa_payment_id,
          email: email,
          phone: phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLogo.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }
      logoData = updatedLogo;
    } else {
      // Создаем новый логотип
      const { data: newLogo, error: insertError } = await supabase
        .from('generated_logos')
        .insert({
          user_id: user_id,
          name: name,
          keywords: keywords,
          logo_url: logoUrl,
          is_paid: true,
          payment_id: yookassa_payment_id,
          email: email,
          phone: phone,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }
      logoData = newLogo;
    }

    console.log(`Logo payment processed successfully for payment ${yookassa_payment_id}`);
    
    // Здесь можно добавить отправку email с логотипом
    
  } catch (error) {
    console.error('Error processing logo payment:', error);
  }
}

// Обработка оплаты брендбука
async function processBrandbookPayment(paymentData: any) {
  const supabase = getSupabaseClient();
  const { user_id, product_data, yookassa_payment_id } = paymentData;
  const { name, keywords, logoUrl, slogan, industry, brandStyle, email } = product_data;

  try {
    // Генерируем полный брендбук
    const brandbook = await brandbookService.generateBrandbook(
      name, 
      keywords, 
      logoUrl, 
      brandStyle, 
      industry, 
      slogan
    );
    
    // Сохраняем в базу данных
    const { data: savedBrandbook, error: insertError } = await supabase
      .from('brandbooks')
      .insert({
        user_id: user_id,
        order_id: yookassa_payment_id, // Используем payment_id как order_id
        business_name: name,
        keywords: keywords,
        slogan: slogan || brandbook.slogan || '',
        original_logo_url: logoUrl,
        logo_variants: brandbook.logoVariants || [],
        fonts: brandbook.fonts || [],
        color_palette: brandbook.colors || [],
        icons: brandbook.icons || [],
        guidelines: brandbook.guidelines || null,
        applications: brandbook.applications || null,
        status: 'completed',
        payment_status: 'completed',
        is_demo: false,
        completed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') { // Ошибка уникальности (дубликат)
        console.warn(`Brandbook with order_id ${yookassa_payment_id} already exists. Skipping.`);
        return;
      }
      throw insertError;
    }

    // Обновляем статус логотипа на купленный
    await supabase
      .from('generated_logos')
      .update({ 
        is_paid: true,
        order_id: yookassa_payment_id,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id)
      .eq('logo_url', logoUrl);

    console.log(`Brandbook payment processed successfully for payment ${yookassa_payment_id}`);
    
    // Здесь можно добавить отправку email с брендбуком
    
  } catch (error) {
    console.error('Error processing brandbook payment:', error);
  }
}

export default router;
