import path from 'path';

// Один путь к папке сгенерированных картинок для записи и для раздачи —
// раньше они расходились, и часть вариаций не открывалась.
// В докере это общий volume.
export const GENERATED_LOGOS_DIR =
  process.env.GENERATED_LOGOS_DIR || path.join(process.cwd(), 'public', 'generated-logos');

// Префикс, под которым файлы отдаются наружу
export const GENERATED_LOGOS_URL_PREFIX = '/generated-logos/';

// Чистый логотип лежит в том же каталоге, что и превью, но раздавать его
// статикой нельзя: он выдаётся только через /api/download-logo после проверки
// оплаты. Признак — суффикс в имени файла.
export const SOURCE_LOGO_SUFFIX = '-source';

export const isSourceLogoFile = (urlOrPath: string): boolean =>
  path.basename(urlOrPath).includes(SOURCE_LOGO_SUFFIX);

// Превью с водяным знаком — единственное, что можно обрабатывать до оплаты.
// Превью и чистый файл различаются только суффиксом при одном uuid, поэтому
// всё, что читает файл по ссылке до оплаты, обязано проверять именно это.
export const isPreviewLogoFile = (urlOrPath: string): boolean => {
  const name = path.basename(urlOrPath);
  return name.endsWith('-preview.png') && !isSourceLogoFile(name);
};

// URL картинки → путь на диске. Обрезка до имени файла не даёт выйти
// за пределы каталога через ../ в значении из базы.
export const resolveGeneratedLogoPath = (url: string | null | undefined): string | null => {
  if (!url) return null;

  const withoutPrefix = url.startsWith(GENERATED_LOGOS_URL_PREFIX)
    ? url.slice(GENERATED_LOGOS_URL_PREFIX.length)
    : url.replace(/^\/?public\/generated-logos\//, '');

  const fileName = path.basename(withoutPrefix);

  if (!fileName || fileName === '.' || fileName === '..') return null;

  return path.join(GENERATED_LOGOS_DIR, fileName);
};
