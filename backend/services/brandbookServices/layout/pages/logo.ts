import { loadArtwork, pickAsset, place } from '../artwork';
import { bullets, hairlinePlate, label, paragraph, plate, title } from '../blocks';
import { chrome } from '../chrome';
import { BrandbookDoc, PageContext, PageModule } from '../document';
import { page, text } from '../svg';
import { SIZE } from '../theme';
import { BODY_TOP, colWidth, colX } from '../units';

const LEFT = { x: colX(0), width: colWidth(7) };
const RIGHT = { x: colX(8), width: colWidth(4) };
const PLATE = { y: BODY_TOP, height: 108, padding: 14 };

const render = async (doc: BrandbookDoc, ctx: PageContext): Promise<string> => {
  const { theme } = doc;
  const primary = pickAsset(doc.logoAssets, 'primary', 'stacked', 'horizontal');
  const artwork = await loadArtwork(primary);

  const parts: string[] = [
    chrome(doc, ctx, 'Логотип'),
    plate(theme, { x: LEFT.x, y: PLATE.y, width: LEFT.width, height: PLATE.height }),
    place(artwork, {
      x: LEFT.x + PLATE.padding,
      y: PLATE.y + PLATE.padding,
      width: LEFT.width - PLATE.padding * 2,
      height: PLATE.height - PLATE.padding * 2,
    }),
  ];

  let y = PLATE.y + PLATE.height + 10;

  parts.push(title(theme, LEFT.x, y, primary?.name || 'Основная версия'));
  y += 6;

  const description = paragraph(theme, {
    x: LEFT.x,
    y,
    width: LEFT.width,
    content: `${primary?.description || ''} ${primary?.usage || ''}`.trim(),
    size: SIZE.small,
    fill: theme.muted,
    maxLines: 3,
  });

  parts.push(description.svg);

  // Векторный логотип масштабируется без потерь — это то, за что заплатили,
  // и покупатель должен знать, какой файл брать
  const hasVector = !!primary?.files.svg;

  parts.push(
    hairlinePlate(theme, { x: LEFT.x, y: 178, width: LEFT.width, height: 12 }),
    text({
      x: LEFT.x + 4,
      y: 185.5,
      content: hasVector
        ? 'В архиве: SVG для любого размера, PNG 2048 px с прозрачным фоном'
        : 'В архиве: PNG 2048 px с прозрачным фоном',
      family: theme.body.family,
      size: SIZE.small,
      fill: theme.ink,
    })
  );

  const rules = doc.guidelines?.logoRules?.slice(0, 6) || [];

  if (rules.length) {
    parts.push(label(theme, RIGHT.x, BODY_TOP + 2, 'Правила размещения'));

    parts.push(
      bullets(theme, {
        x: RIGHT.x,
        y: BODY_TOP + 10,
        width: RIGHT.width,
        items: rules,
        gap: 2.5,
      }).svg
    );
  }

  return page(theme.paper, parts.join(''));
};

export const logoPage: PageModule = {
  key: 'logo',
  section: 'Логотип',
  title: 'Логотип',
  enabled: (doc) => doc.logoAssets.length > 0,
  render,
};
