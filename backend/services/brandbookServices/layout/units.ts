// Полосы авторятся в миллиметрах: SVG объявляется как width="297mm"
// height="210mm" viewBox="0 0 297 210", и одна единица равна миллиметру.
// Замерено в образе: rsvg-convert -f pdf даёт из такой полосы точный
// A4-альбом (841.89 x 595.276 pt).
export const PAGE = { width: 297, height: 210 };

export const MARGIN = { top: 16, right: 18, bottom: 14, left: 18 };

export const CONTENT = {
  x: MARGIN.left,
  y: MARGIN.top,
  width: PAGE.width - MARGIN.left - MARGIN.right,
  height: PAGE.height - MARGIN.top - MARGIN.bottom,
  right: PAGE.width - MARGIN.right,
  bottom: PAGE.height - MARGIN.bottom,
};

// Двенадцать колонок: шесть цветов палитры и четыре носителя делятся без остатка
export const COLUMNS = 12;
export const GUTTER = 4;

const COLUMN_WIDTH = (CONTENT.width - GUTTER * (COLUMNS - 1)) / COLUMNS;

// Левый край колонки и ширина пролёта в несколько колонок
export const colX = (index: number): number => CONTENT.x + index * (COLUMN_WIDTH + GUTTER);

export const colWidth = (span: number): number =>
  span * COLUMN_WIDTH + (span - 1) * GUTTER;

// Ниже шапки полосы начинается её содержимое
export const BODY_TOP = 42;

export const PT_PER_MM = 72 / 25.4;

export const mmToPt = (mm: number): number => Math.round(mm * PT_PER_MM * 10) / 10;

export const round = (value: number): string => value.toFixed(2);
