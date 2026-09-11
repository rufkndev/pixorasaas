// Забирает шрифты брендбука в public/fonts: полные TTF из репозитория google/fonts
// (их ставим в образ и отдаём покупателю) и подмножества woff2 из Google (их грузит
// браузер с нашего домена). Запускать вручную при смене каталога шрифтов:
//   node scripts/fetch-fonts.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// fileURLToPath, а не URL.pathname: в пути проекта есть кириллица, и pathname
// отдаёт её процентно-кодированной — файлы уезжали в каталог-двойник
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'fonts');

// Браузерный UA обязателен: без него Google отдаёт EOT вместо woff2
const UA_BROWSER =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

// Берём только те подмножества, которыми пользуемся. Греческий и вьетнамский
// в брендбуке не нужны, а весят столько же, сколько кириллица.
const SUBSETS = ['cyrillic-ext', 'cyrillic', 'latin-ext', 'latin'];

// dir — каталог в google/fonts, files — что оттуда качать (курсивы не берём),
// weights — что просить у css2 для woff2.
const FAMILIES = [
  { family: 'Inter', slug: 'inter', dir: 'inter', files: { 'Inter[opsz,wght].ttf': 'inter-var.ttf' }, weights: '400..700' },
  { family: 'Golos Text', slug: 'golos-text', dir: 'golostext', files: { 'GolosText[wght].ttf': 'golos-text-var.ttf' }, weights: '400..700' },
  { family: 'Manrope', slug: 'manrope', dir: 'manrope', files: { 'Manrope[wght].ttf': 'manrope-var.ttf' }, weights: '400..700' },
  { family: 'IBM Plex Sans', slug: 'ibm-plex-sans', dir: 'ibmplexsans', files: { 'IBMPlexSans[wdth,wght].ttf': 'ibm-plex-sans-var.ttf' }, weights: '400..700' },
  { family: 'PT Sans', slug: 'pt-sans', dir: 'ptsans', files: { 'PT_Sans-Web-Regular.ttf': 'pt-sans-400.ttf', 'PT_Sans-Web-Bold.ttf': 'pt-sans-700.ttf' }, weights: '400;700' },
  { family: 'PT Serif', slug: 'pt-serif', dir: 'ptserif', files: { 'PT_Serif-Web-Regular.ttf': 'pt-serif-400.ttf', 'PT_Serif-Web-Bold.ttf': 'pt-serif-700.ttf' }, weights: '400;700' },
  { family: 'Playfair Display', slug: 'playfair-display', dir: 'playfairdisplay', files: { 'PlayfairDisplay[wght].ttf': 'playfair-display-var.ttf' }, weights: '400..700' },
  { family: 'Unbounded', slug: 'unbounded', dir: 'unbounded', files: { 'Unbounded[wght].ttf': 'unbounded-var.ttf' }, weights: '400..700' },
  { family: 'Rubik', slug: 'rubik', dir: 'rubik', files: { 'Rubik[wght].ttf': 'rubik-var.ttf' }, weights: '400..700' },
  { family: 'Oswald', slug: 'oswald', dir: 'oswald', files: { 'Oswald[wght].ttf': 'oswald-var.ttf' }, weights: '400..700' },
  { family: 'Nunito', slug: 'nunito', dir: 'nunito', files: { 'Nunito[wght].ttf': 'nunito-var.ttf' }, weights: '400..700' },
  { family: 'Comfortaa', slug: 'comfortaa', dir: 'comfortaa', files: { 'Comfortaa[wght].ttf': 'comfortaa-var.ttf' }, weights: '400..700' },
];

const get = async (url, headers = {}) => {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} — ${url}`);
  return response;
};

const download = async (url, target) => {
  const response = await get(url);
  await fs.writeFile(target, Buffer.from(await response.arrayBuffer()));
};

const rawUrl = (dir, file) =>
  `https://raw.githubusercontent.com/google/fonts/main/ofl/${dir}/${encodeURIComponent(file)}`;

// Разбирает ответ css2 на блоки @font-face: комментарий перед блоком — имя подмножества
const parseFaces = (css) => {
  const faces = [];
  const re = /\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*\{([^}]+)\}/g;

  for (const [, subset, body] of css.matchAll(re)) {
    const src = body.match(/url\((https:\/\/[^)]+)\)/)?.[1];
    const range = body.match(/unicode-range:\s*([^;]+);/)?.[1]?.trim();
    const weight = body.match(/font-weight:\s*([^;]+);/)?.[1]?.trim() || '400';
    if (src && range) faces.push({ subset, src, range, weight });
  }

  return faces;
};

const fetchFamily = async (font) => {
  const dir = path.join(OUT, font.slug);
  await fs.mkdir(path.join(dir, 'web'), { recursive: true });

  for (const [source, target] of Object.entries(font.files)) {
    await download(rawUrl(font.dir, source), path.join(dir, target));
  }
  await download(rawUrl(font.dir, 'OFL.txt'), path.join(dir, 'OFL.txt'));

  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.family)}:wght@${font.weights}&display=swap`;
  const css = await (await get(cssUrl, { 'User-Agent': UA_BROWSER })).text();
  const faces = parseFaces(css).filter((face) => SUBSETS.includes(face.subset));

  if (!faces.length) throw new Error(`${font.family}: Google не отдал ни одного подмножества`);

  const blocks = [];
  let index = 0;

  for (const face of faces) {
    const name = `${font.slug}-${face.subset}-${index++}.woff2`;
    await download(face.src, path.join(dir, 'web', name));
    blocks.push(
      `/* ${face.subset} */\n@font-face {\n` +
        `  font-family: '${font.family}';\n  font-style: normal;\n` +
        `  font-weight: ${face.weight};\n  font-display: swap;\n` +
        `  src: url(/fonts/${font.slug}/web/${name}) format('woff2');\n` +
        `  unicode-range: ${face.range};\n}`
    );
  }

  await fs.writeFile(path.join(OUT, `${font.slug}.css`), `${blocks.join('\n\n')}\n`);

  return {
    family: font.family,
    slug: font.slug,
    css: `/fonts/${font.slug}.css`,
    ttf: Object.values(font.files),
    licence: 'OFL-1.1',
    licenceFile: 'OFL.txt',
  };
};

const main = async () => {
  await fs.mkdir(OUT, { recursive: true });
  const manifest = [];

  for (const font of FAMILIES) {
    process.stdout.write(`${font.family}… `);
    manifest.push(await fetchFamily(font));
    console.log('готово');
  }

  await fs.writeFile(path.join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\n${manifest.length} семейств в ${path.relative(ROOT, OUT)}`);
};

main().catch((error) => {
  console.error(`\nОшибка: ${error.message}`);
  process.exit(1);
});
