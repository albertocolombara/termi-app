import { Skia, type SkImage } from '@shopify/react-native-skia';

import { arquivoDaNuvem, atualizarVersaoDasNuvens, versaoDasNuvens } from '@/data/nuvens/nuvens';
import { mosaicoDeNuvens, PASSAGENS, type BlocoDeNuvem, type Passagem } from '@/domain/janela/nuvens';

export type NuvensState = { dia: SkImage | null; noite: SkImage | null; b: [number, number, number] };

const PX = 512;

async function imagem(passagem: Passagem, b: BlocoDeNuvem): Promise<SkImage | null> {
  const f = await arquivoDaNuvem(passagem, b);
  if (!f) return null;
  try {
    return Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(await f.bytes()));
  } catch {
    return null;
  }
}

/** Mosaico 2×2 (1024 px) de uma passagem. `null` se nenhum bloco carregou. */
async function montar(passagem: Passagem, blocos: BlocoDeNuvem[]): Promise<SkImage | null> {
  const ims = await Promise.all(blocos.map((b) => imagem(passagem, b)));
  if (ims.every((i) => !i)) return null;
  const surface = Skia.Surface.Make(2 * PX, 2 * PX);
  if (!surface) return null;
  const canvas = surface.getCanvas();
  const paint = Skia.Paint();
  canvas.clear(Skia.Color('black'));
  ims.forEach((im, k) => {
    if (!im) return;
    const dst = Skia.XYWHRect((k % 2) * PX, Math.floor(k / 2) * PX, PX, PX);
    canvas.drawImageRect(im, Skia.XYWHRect(0, 0, im.width(), im.height()), dst, paint);
  });
  surface.flush();
  const snap = surface.makeImageSnapshot();
  return snap.makeNonTextureImage() ?? snap;
}

/**
 * Nuvens reais em volta do avião: mosaico 2×2 de blocos de 18° (36° × 36°), das duas passagens do
 * satélite. Só remonta quando o avião muda de mosaico (a cada ~2.000 km).
 */
export function makeAtlasDeNuvens(onChange: (s: NuvensState) => void) {
  let chave = '';
  let pronto = false;
  let tentarApos = 0;
  let pendente = 0;
  // Sem versão guardada (ex.: tela de teste, ou o embarque não achou o índice): busca uma vez.
  let versao: Promise<unknown> = versaoDasNuvens() ? Promise.resolve() : atualizarVersaoDasNuvens();
  return {
    update(la: number, lo: number) {
      const m = mosaicoDeNuvens({ lat: la, lon: lo });
      const k = `${m.oeste}/${m.norte}`;
      // Mesmo mosaico: nada a fazer, ou espera 1 min antes de tentar de novo (sem rede).
      if (k === chave && (pronto || Date.now() < tentarApos)) return;
      chave = k;
      pronto = false;
      const meu = ++pendente;
      const falhou = () => {
        if (meu !== pendente) return;
        tentarApos = Date.now() + 60_000;
        if (!versaoDasNuvens()) versao = atualizarVersaoDasNuvens();
      };
      versao
        .then(() => Promise.all(PASSAGENS.map((p) => montar(p, m.blocos))))
        .then(([dia, noite]) => {
          if (meu !== pendente) return;
          if (!dia && !noite) return falhou();
          pronto = true;
          onChange({ dia: dia ?? noite, noite: noite ?? dia, b: [m.oeste, m.norte, m.lado] });
        }, falhou);
    },
  };
}
