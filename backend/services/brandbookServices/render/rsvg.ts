import { execFile } from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import { log } from '../../../logger';

const run = promisify(execFile);

// PDF собирает rsvg-convert, а не sharp: libvips внутри sharp собран без PDF
// ни на вход, ни на выход. Пакет librsvg2-bin стоит в стадии base.
const RSVG = process.env.RSVG_CONVERT_BIN || 'rsvg-convert';
const PDFUNITE = 'pdfunite';
const PDFINFO = 'pdfinfo';

const TIMEOUT = 120_000;

export class RenderError extends Error {
  constructor(message: string, readonly stderr?: string) {
    super(stderr ? `${message}: ${stderr.trim().split('\n')[0]}` : message);
    this.name = 'RenderError';
  }
}

// execFile, а не exec: без shell бренд-строки не попадают в командную строку
// вовсе — они внутри файлов полос
const exec = async (bin: string, args: string[], label: string): Promise<string> => {
  try {
    const { stdout } = await run(bin, args, { timeout: TIMEOUT, maxBuffer: 8 * 1024 * 1024 });
    return stdout;
  } catch (error: any) {
    throw new RenderError(label, error?.stderr || error?.message);
  }
};

export const pdfPageCount = async (file: string): Promise<number> => {
  const stdout = await exec(PDFINFO, [file], 'pdfinfo');
  const matched = stdout.match(/^Pages:\s+(\d+)/m);

  return matched ? Number(matched[1]) : 0;
};

// Замерено в образе: librsvg 2.54 принимает все полосы одной командой и отдаёт
// многостраничный файл. pdfunite — запасной путь: он не дедуплицирует
// подмножества шрифтов и файл выходит тяжелее.
const joinPages = async (dir: string, files: string[], out: string): Promise<void> => {
  try {
    await exec(RSVG, ['-f', 'pdf', ...files, '-o', out], 'rsvg-convert');

    if ((await pdfPageCount(out)) === files.length) return;

    log.error('rsvg-convert собрал не все полосы, склеиваем постранично');
  } catch (error: any) {
    log.error('Многостраничный вызов rsvg-convert не удался:', error.message);
  }

  const singles: string[] = [];

  for (const [index, file] of files.entries()) {
    const single = path.join(dir, `single-${String(index).padStart(3, '0')}.pdf`);
    await exec(RSVG, ['-f', 'pdf', file, '-o', single], 'rsvg-convert');
    singles.push(single);
  }

  await exec(PDFUNITE, [...singles, out], 'pdfunite');
};

// Макеты рендерит тот же бинарник, что и полосы. Смешивать нельзя: sharp несёт
// librsvg 2.61, а пакет — 2.54, и метрики текста у них расходятся.
const withTempFile = async <T>(svg: string, run: (file: string, dir: string) => Promise<T>): Promise<T> => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mockup-'));

  try {
    const file = path.join(dir, 'source.svg');
    await fs.writeFile(file, svg, 'utf8');
    return await run(file, dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
};

// Ширина задаётся в пикселях: у экранных макетов она и есть размер файла,
// у печатных — разрешение превью
export const svgToPng = async (svg: string, width: number): Promise<Buffer> =>
  withTempFile(svg, async (file, dir) => {
    const out = path.join(dir, 'out.png');
    await exec(RSVG, ['-f', 'png', '-w', String(Math.round(width)), file, '-o', out], 'rsvg-convert');
    return fs.readFile(out);
  });

// Полосы приходят готовыми строками SVG. Временный каталог в /tmp: контейнер
// работает из-под USER node и в /app писать не может.
export const svgsToPdf = async (svgs: string[]): Promise<Buffer> => {
  if (!svgs.length) throw new RenderError('нет ни одной полосы для PDF');

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'brandbook-'));

  try {
    const files: string[] = [];

    for (const [index, svg] of svgs.entries()) {
      const file = path.join(dir, `page-${String(index).padStart(3, '0')}.svg`);
      await fs.writeFile(file, svg, 'utf8');
      files.push(file);
    }

    const out = path.join(dir, 'brandbook.pdf');
    await joinPages(dir, files, out);

    const pages = await pdfPageCount(out);

    if (pages !== svgs.length) {
      throw new RenderError(`в PDF ${pages} страниц вместо ${svgs.length}`);
    }

    return await fs.readFile(out);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
};
