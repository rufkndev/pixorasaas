import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { Response } from 'express';

import { Brandbook } from '../../db/types';
import { resolveGeneratedLogoPath } from '../../paths';
import { contentDisposition, fileSlug } from '../../utils/slug';
import { iconSetService } from './brand/iconSetService';
import { Mockup } from './mockups';
import { log } from '../../logger';

const FONTS_DIR = process.env.FONTS_DIR || path.join(process.cwd(), 'public', 'fonts');

// Куда в архиве кладётся каждый носитель. Плоская папка mockups быстро
// превращается в свалку из десятка файлов с похожими именами.
const MOCKUP_FOLDER: Record<string, string> = {
  'business-card': 'business-card',
  'social-post': 'social',
  'social-story': 'social',
  'vk-cover': 'social',
  presentation: 'presentation',
  'email-signature': 'email',
};


type Archive = ReturnType<typeof archiver>;

const appendFile = (archive: Archive, url: string | undefined, name: string): boolean => {
  const file = url ? resolveGeneratedLogoPath(url) : null;

  if (!file || !fs.existsSync(file)) return false;

  archive.append(fs.readFileSync(file), { name });
  return true;
};

const addLogo = (archive: Archive, brandbook: Brandbook): void => {
  for (const [index, asset] of (brandbook.logoVariants || []).entries()) {
    const base = fileSlug(asset.kind || asset.name, `logo-${index + 1}`);

    appendFile(archive, asset.files?.svg, `logo/svg/${base}.svg`);
    appendFile(archive, asset.files?.png2048, `logo/png/${base}.png`);
  }
};

const addMockups = (archive: Archive, brandbook: Brandbook): void => {
  const mockups: Mockup[] = Array.isArray(brandbook.applications) ? brandbook.applications : [];

  for (const mockup of mockups) {
    const folder = `mockups/${MOCKUP_FOLDER[mockup.id] || fileSlug(mockup.id, 'mockup')}`;
    const base = fileSlug(mockup.id, 'mockup');

    // Подпись письма — не картинка: у неё html и логотип к нему. Часть
    // клиентов режет data-URI, и тогда картинку подставляют вручную.
    if (mockup.files?.html) {
      appendFile(archive, mockup.files.html, `${folder}/signature.html`);
      appendFile(archive, mockup.files.png, `${folder}/logo.png`);
      continue;
    }

    appendFile(archive, mockup.files?.svg, `${folder}/${base}.svg`);
    appendFile(archive, mockup.files?.svgBack, `${folder}/${base}-back.svg`);
    appendFile(archive, mockup.files?.png, `${folder}/${base}.png`);
    appendFile(archive, mockup.files?.pngBack, `${folder}/${base}-back.png`);
    appendFile(archive, mockup.files?.pdf, `${folder}/${base}-print.pdf`);
  }
};

const addIcons = (archive: Archive, brandbook: Brandbook): void => {
  const items = (brandbook.icons || []).filter((item: any) => item?.svg);

  for (const [index, item] of items.entries()) {
    const folder = item.category === 'icon' ? 'icons/svg' : 'icons/patterns';
    const base = fileSlug(item.id || item.name, `graphic-${index + 1}`);

    archive.append(Buffer.from(item.svg), { name: `${folder}/${base}.svg` });
  }

  // Лицензия набора обязательна: Apache-2.0 у Remix Icon прямо требует
  // прикладывать её текст к распространяемым файлам
  for (const set of iconSetService.licences(items)) {
    archive.append(
      Buffer.from(
        `${set.title}\nЛицензия: ${set.licence}\nИсточник: ${set.url}\n\n` +
          'Иконки можно использовать в коммерческих проектах, перекрашивать и\n' +
          'масштабировать. Полный текст лицензии — на сайте набора.\n'
      ),
      { name: `icons/LICENSE-${set.set}.txt` }
    );
  }
};

// В архив кладутся только те семейства, что попали в этот брендбук: класть
// все двенадцать — это 7 МБ чужих шрифтов, которые покупателю не нужны
const addFonts = (archive: Archive, brandbook: Brandbook): void => {
  for (const font of brandbook.fonts || []) {
    if (!font?.slug) continue;

    const dir = path.join(FONTS_DIR, font.slug);

    if (!fs.existsSync(dir)) continue;

    for (const file of fs.readdirSync(dir)) {
      const full = path.join(dir, file);

      if (fs.statSync(full).isFile()) {
        archive.append(fs.readFileSync(full), { name: `fonts/${font.family}/${file}` });
      }
    }

    const web = path.join(dir, 'web');

    if (fs.existsSync(web)) {
      for (const file of fs.readdirSync(web)) {
        archive.append(fs.readFileSync(path.join(web, file)), {
          name: `fonts/${font.family}/woff2/${file}`,
        });
      }
    }
  }
};

// Обработчик 'error' обязателен: archiver кидает событие при сбое чтения файла
// посреди стрима, а необработанное 'error' на EventEmitter роняет процесс целиком.
export const streamBrandbookArchive = (res: Response, brandbook: Brandbook): void => {
  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.on('error', (error: any) => {
    log.error('Сбой при сборке архива брендбука:', error.message);
    res.end();
  });

  // Клиент оборвал скачивание — дочитывать файлы с диска незачем
  res.on('close', () => archive.abort());

  // Сырая кириллица в Content-Disposition отбивается частью клиентов,
  // поэтому ASCII-имя плюс filename* с процентным кодированием
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', contentDisposition(`${brandbook.businessName}-brandbook`, 'zip'));
  archive.pipe(res);

  appendFile(archive, brandbook.pdfUrl, 'brandbook.pdf');

  addLogo(archive, brandbook);
  addMockups(archive, brandbook);
  addIcons(archive, brandbook);
  addFonts(archive, brandbook);

  archive.finalize();
};
