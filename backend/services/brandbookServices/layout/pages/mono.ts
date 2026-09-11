import { AssetKind } from '../../brand/logoAssetService';
import { paragraph } from '../blocks';
import { chrome } from '../chrome';
import { BrandbookDoc, PageContext, PageModule } from '../document';
import { page } from '../svg';
import { SIZE } from '../theme';
import { BODY_TOP, CONTENT } from '../units';
import { assetCards } from './assetCards';

const KINDS: AssetKind[] = ['mono-black', 'mono-white', 'one-color'];

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
      'Эти версии нужны там, где красок меньше, чем в логотипе: печать в одну краску, гравировка, вышивка, штамп, тиснение. Это не обесцвеченный логотип, а отдельные файлы — переводить основную версию в серое нельзя, двухцветный знак превратится в два неразличимых пятна.',
    size: SIZE.body,
    fill: theme.muted,
    maxLines: 2,
  });

  return page(
    theme.paper,
    [
      chrome(doc, ctx, 'Монохром и выворотка'),
      intro.svg,
      await assetCards(doc, present(doc), BODY_TOP + intro.height + 8, 106),
    ].join('')
  );
};

export const monoPage: PageModule = {
  key: 'mono',
  section: 'Логотип',
  title: 'Монохром и выворотка',
  enabled: (doc) => present(doc).length > 0,
  render,
};
