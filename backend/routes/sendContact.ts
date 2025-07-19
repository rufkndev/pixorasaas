import express from 'express';
import nodemailer from 'nodemailer';

const router = express.Router();

// Настройка транспорта для отправки email
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'arttaranovbusiness@gmail.com',
      pass: process.env.EMAIL_PASSWORD // App password для Gmail
    }
  });
};

// Маршрут для отправки контактного сообщения
router.post('/send-contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Валидация данных
    if (!name || !email || !message) {
      return res.status(400).json({ 
        error: 'Все поля обязательны для заполнения' 
      });
    }

    // Проверка валидности email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Некорректный email адрес' 
      });
    }

    const transporter = createTransporter();

    // Настройка письма
    const mailOptions = {
      from: process.env.EMAIL_USER || 'arttaranovbusiness@gmail.com',
      to: 'arttaranovbusiness@gmail.com', // Адрес получателя
      subject: `Новое сообщение от ${name} - Pixora Contact Form`,
      html: `
        <h2>Новое сообщение с формы контактов</h2>
        <p><strong>Имя:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Сообщение:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
        <hr>
        <p><small>Это сообщение было отправлено с сайта Pixora</small></p>
      `,
      // Также отправляем копию отправителю для подтверждения
      replyTo: email
    };

    // Отправка email
    await transporter.sendMail(mailOptions);

    // Отправка подтверждения отправителю
    const confirmationMailOptions = {
      from: process.env.EMAIL_USER || 'arttaranovbusiness@gmail.com',
      to: email,
      subject: 'Подтверждение получения сообщения - Pixora',
      html: `
        <h2>Спасибо за ваше сообщение!</h2>
        <p>Здравствуйте, ${name}!</p>
        <p>Мы получили ваше сообщение и обязательно свяжемся с вами в ближайшее время.</p>
        <p><strong>Ваше сообщение:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
        <hr>
        <p>С уважением,<br>Команда Pixora</p>
      `
    };

    await transporter.sendMail(confirmationMailOptions);

    res.json({ 
      success: true, 
      message: 'Сообщение успешно отправлено' 
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Ошибка при отправке сообщения. Попробуйте позже.' 
    });
  }
});

export default router; 