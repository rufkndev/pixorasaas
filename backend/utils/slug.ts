// Кириллица в именах файлов и в заголовках ломает и то, и другое: без
// транслитерации название вырезалось целиком и файл выходил просто «_logo»,
// а в Content-Disposition сырая кириллица отбивается частью клиентов.
const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
  э: 'e', ю: 'yu', я: 'ya',
};

export const translit = (value: string): string =>
  value
    .toLowerCase()
    .split('')
    .map((char) => TRANSLIT[char] ?? char)
    .join('');

export const slugify = (value: string | null | undefined, fallback = 'brand'): string => {
  const slug = translit(value || '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || fallback;
};

// Имя файла внутри архива: подчёркивания вместо дефисов — так уже названы
// файлы логотипа, менять привычный вид без нужды не стоит
export const fileSlug = (value: string | null | undefined, fallback = 'brand'): string =>
  slugify(value, fallback).replace(/-/g, '_');

// ASCII-имя обязательно как запасное: filename* понимают не все клиенты,
// а на голом filename с кириллицей часть из них отвечает ошибкой
export const contentDisposition = (name: string, extension: string): string => {
  const ascii = `${fileSlug(name)}.${extension}`;
  const utf8 = encodeURIComponent(`${name.trim()}.${extension}`);

  return `attachment; filename="${ascii}"; filename*=UTF-8''${utf8}`;
};

// Название бренда часто уже приходит в кавычках — «Кофейня «Тёплый угол»».
// Вторые кавычки вокруг таких имён выглядят опечаткой.
export const quoted = (name: string): string =>
  /[«»"„“]/.test(name) ? name : `«${name}»`;
