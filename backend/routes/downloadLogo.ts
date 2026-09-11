import archiver from 'archiver';
import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

import { logosRepo } from '../db/repositories';
import { requireAuth } from '../auth/middleware';
import { resolveGeneratedLogoPath } from '../paths';
import { rawNameFor } from '../services/logoService';
import { fileSlug } from '../utils/slug';

const router = Router();

const fileNameFor = (name: string | null): string => fileSlug(name, 'logo');

// Сырой кадр модели лежит рядом с обработанным, отдельной колонки в базе нет
const rawPathFor = (sourceUrl: string | null): string | null => {
  const sourcePath = resolveGeneratedLogoPath(sourceUrl);
  if (!sourcePath) return null;

  const raw = path.join(path.dirname(sourcePath), rawNameFor(sourcePath));
  return fs.existsSync(raw) ? raw : null;
};

// Скачивание чистого логотипа. Форматы: png (обработанный, прозрачный),
// svg (вектор), original (кадр модели как есть), zip (всё сразу), jpg, webp
router.get('/download-logo/:logoId', requireAuth, async (req: any, res) => {
  try {
    const { logoId } = req.params;
    const format = String(req.query.format || 'png').toLowerCase();

    const logo = await logosRepo.findByIdForUser(logoId, req.user.id);

    if (!logo) {
      return res.status(404).json({ error: 'Logo not found' });
    }

    // Проверяем статус оплаты
    if (!logo.isPaid) {
      return res.status(403).json({
        error: 'Payment required',
        message: 'Для скачивания логотипа требуется оплата',
      });
    }

    const fileName = fileNameFor(logo.name);

    // Скачивается всегда чистый файл; logo_url — это превью с водяным знаком.
    // Старые записи до разделения хранят оригинал прямо в logo_url
    const cleanUrl = logo.originalLogoUrl || logo.logoUrl;
    const cleanPath = resolveGeneratedLogoPath(cleanUrl);
    const svgPath = resolveGeneratedLogoPath(logo.originalSvgUrl);
    const rawPath = rawPathFor(logo.originalLogoUrl);

    if (format === 'zip') {
      return sendArchive(res, fileName, { cleanPath, svgPath, rawPath });
    }

    // Вектор отдаём как есть: пересобирать его нечем и незачем.
    // У логотипов, сделанных до перехода на вектор, svg просто нет
    if (format === 'svg') {
      if (!svgPath || !fs.existsSync(svgPath)) {
        return res.status(404).json({
          error: 'SVG not available',
          message: 'Для этого логотипа векторная версия не создавалась',
        });
      }

      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}.svg"`);
      return res.send(fs.readFileSync(svgPath));
    }

    // Кадр ровно в том виде, в каком его сгенерировала модель
    if (format === 'original') {
      if (!rawPath) {
        return res.status(404).json({
          error: 'Original not available',
          message: 'Исходный кадр модели для этого логотипа не сохранялся',
        });
      }

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}_original.png"`);
      return res.send(fs.readFileSync(rawPath));
    }

    if (!cleanPath || !fs.existsSync(cleanPath)) {
      return res.status(404).json({ error: 'Logo file not found' });
    }

    const logoBuffer = fs.readFileSync(cleanPath);

    // jpg не поддерживает прозрачность — подкладываем белое, иначе фон чёрный
    if (format === 'jpg' || format === 'jpeg') {
      const out = await sharp(logoBuffer).flatten({ background: '#ffffff' }).jpeg({ quality: 95 }).toBuffer();
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}.jpg"`);
      return res.send(out);
    }

    if (format === 'webp') {
      const out = await sharp(logoBuffer).webp({ quality: 95 }).toBuffer();
      res.setHeader('Content-Type', 'image/webp');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}.webp"`);
      return res.send(out);
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}.png"`);
    return res.send(logoBuffer);
  } catch (error: any) {
    console.error('Error downloading logo:', error.message);
    res.status(500).json({ error: 'Failed to download logo' });
  }
});

// Один архив со всем, что купил пользователь: вектор, прозрачный PNG,
// белый JPG для документов и кадр модели
function sendArchive(
  res: any,
  fileName: string,
  files: { cleanPath: string | null; svgPath: string | null; rawPath: string | null }
): void {
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}_logo.zip"`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (error) => {
    console.error('Не удалось собрать архив логотипа:', error.message);
    res.end();
  });
  archive.pipe(res);

  if (files.svgPath && fs.existsSync(files.svgPath)) {
    archive.append(fs.readFileSync(files.svgPath), { name: `${fileName}.svg` });
  }

  if (files.cleanPath && fs.existsSync(files.cleanPath)) {
    const png = fs.readFileSync(files.cleanPath);
    archive.append(png, { name: `${fileName}.png` });
    archive.append(
      sharp(png).flatten({ background: '#ffffff' }).jpeg({ quality: 95 }),
      { name: `${fileName}.jpg` }
    );
  }

  if (files.rawPath) {
    archive.append(fs.readFileSync(files.rawPath), { name: `original/${fileName}_original.png` });
  }

  archive.finalize();
}

// Предпросмотр логотипа (вотермарка накладывается на фронтенде для неоплаченных)
router.get('/preview-logo/:logoId', requireAuth, async (req: any, res) => {
  try {
    const logo = await logosRepo.findByIdForUser(req.params.logoId, req.user.id);

    if (!logo) {
      return res.status(404).json({ error: 'Logo not found' });
    }

    return res.status(200).json({
      success: true,
      logo: {
        id: logo.id,
        name: logo.name,
        logoUrl: logo.logoUrl,
        isPaid: logo.isPaid,
        createdAt: logo.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Error previewing logo:', error.message);
    res.status(500).json({ error: 'Failed to preview logo' });
  }
});

export default router;
