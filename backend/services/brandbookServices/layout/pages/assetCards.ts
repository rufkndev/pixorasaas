import { LogoAsset } from '../../brand/logoAssetService';
import { loadArtwork, place } from '../artwork';
import { hairlinePlate, paragraph, plate, title } from '../blocks';
import { BrandbookDoc } from '../document';
import { rect } from '../svg';
import { SIZE } from '../theme';
import { colWidth, colX } from '../units';

const SPAN = 4;
const PADDING = 10;

// Карточка версии логотипа: плашка с самим логотипом, название, применение.
// Одинаковая на полосах блокировок и цветовых версий — они отличаются только
// набором версий, а не вёрсткой.
export const assetCards = async (
  doc: BrandbookDoc,
  assets: LogoAsset[],
  top: number,
  plateHeight: number
): Promise<string> => {
  const { theme } = doc;
  const width = colWidth(SPAN);
  const parts: string[] = [];

  for (const [index, asset] of assets.slice(0, 3).entries()) {
    const x = colX(index * SPAN);
    const artwork = await loadArtwork(asset);
    const box = { x, y: top, width, height: plateHeight };

    // Выворотка на белом не видна, поэтому под неё кладётся тёмный цвет
    // палитры — тот же, на котором она и предназначена работать
    parts.push(
      asset.onDark
        ? rect({ ...box, fill: theme.color.dark, radius: 2 })
        : asset.kind === 'mono-black'
          ? hairlinePlate(theme, box)
          : plate(theme, box)
    );

    parts.push(
      place(artwork, {
        x: x + PADDING,
        y: top + PADDING,
        width: width - PADDING * 2,
        height: plateHeight - PADDING * 2,
      }),
      title(theme, x, top + plateHeight + 8, asset.name)
    );

    const usage = paragraph(theme, {
      x,
      y: top + plateHeight + 14,
      width,
      content: asset.usage,
      size: SIZE.small,
      fill: theme.muted,
      maxLines: 4,
    });

    parts.push(usage.svg);
  }

  return parts.join('');
};
