import { AssetKind } from '../../brand/logoAssetService';
import { paragraph } from '../blocks';
import { chrome } from '../chrome';
import { BrandbookDoc, PageContext, PageModule } from '../document';
import { page } from '../svg';
import { SIZE } from '../theme';
import { BODY_TOP, CONTENT } from '../units';
import { assetCards } from './assetCards';

const KINDS: AssetKind[] = ['horizontal', 'stacked', 'mark'];

const present = (doc: BrandbookDoc) =>
  KINDS.map((kind) => doc.logoAssets.find((asset) => asset.kind === kind)).filter(
    (asset): asset is NonNullable<typeof asset> => !!asset
  );

const render = async (doc: BrandbookDoc, ctx: PageContext): Promise<string> => {
  const { theme } = doc;

  const intro = paragraph(theme, {
    x: CONTENT.x,
    y: BODY_TOP,
    width: CONTENT.width,
    content:
      'Одна и та же блокировка не работает везде. Берите ту, что подходит месту: в узкую шапку — горизонтальную, в квадрат — вертикальную, в аватар — только знак. Собирать свои сочетания знака и названия нельзя.',
    size: SIZE.body,
    fill: theme.muted,
    maxLines: 2,
  });

  return page(
    theme.paper,
    [
      chrome(doc, ctx, 'Блокировки'),
      intro.svg,
      await assetCards(doc, present(doc), BODY_TOP + intro.height + 8, 106),
    ].join('')
  );
};

export const lockupsPage: PageModule = {
  key: 'lockups',
  section: 'Логотип',
  title: 'Блокировки',
  enabled: (doc) => present(doc).length > 0,
  render,
};
