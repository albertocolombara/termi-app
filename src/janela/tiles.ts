import { File, Paths } from 'expo-file-system';
import { Skia, SkImage } from '@shopify/react-native-skia';

import { caminhoNoAparelho, type Camada } from '@/domain/voos/blocosDaRota';

// Blocos da rota, baixados do R2 no embarque e durante o voo (data/blocos). Os pacotes do protótipo
// (Barcelona → Londres, 21 MB no APK) saíram em 25/11/2026: bloco ainda não baixado fica pendente e
// a janela mostra a base até ele chegar.

const decodificar = (bytes: Uint8Array) => Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(bytes));

/**
 * Bloco baixado no embarque (data/blocos), em `cache/paisagem/{camada}/{linha}/{coluna}.webp`.
 * Arquivo vazio = oceano (404 no R2). `undefined` = ainda não baixado.
 */
async function blocoBaixado(key: string): Promise<SkImage | null | undefined> {
  const [camada, rc] = key.split('/');
  const [linha, coluna] = rc.split('_');
  const f = new File(Paths.cache, caminhoNoAparelho({ camada: camada as Camada, linha: Number(linha), coluna: Number(coluna) }));
  if (!f.exists) return undefined;
  if (f.size === 0) return null;
  try {
    return decodificar(await f.bytes());
  } catch {
    return null;
  }
}

/** Ainda não baixado: o atlas tenta de novo daqui a pouco. */
const PENDENTE = Symbol('pendente');

async function tile(key: string): Promise<SkImage | null | typeof PENDENTE> {
  const baixado = await blocoBaixado(key);
  return baixado === undefined ? PENDENTE : baixado;
}

export type AtlasState = { image: SkImage | null; b: [number, number, number] };

const N = 4;

/**
 * Monta um mosaico 4×4 de blocos em volta do avião, como no protótipo web.
 * Só remonta quando o avião muda de bloco.
 */
export function makeAtlas(
  dir: 'w10' | 'w8' | 'l9',
  z: number,
  px: number,
  onChange: (s: AtlasState) => void,
) {
  const cell = px / N;
  const deg = 288 / 2 ** z;
  const cache = new Map<string, Promise<SkImage | null | typeof PENDENTE>>();
  let key = '';
  let pending = 0;
  // Bloco que ainda não tinha baixado ficava vazio até o avião sair dele: a janela mostrava só o
  // nível 8, borrado (build-40, logo depois de instalar). Agora o mosaico é refeito a cada 5 s
  // enquanto faltar algum.
  let tentarDeNovoEm = 0;
  const img = (r: number, c: number) => {
    const k = `${dir}/${r}_${c}`;
    if (!cache.has(k)) cache.set(k, tile(k));
    return cache.get(k)!;
  };
  return {
    update(la: number, lo: number) {
      const r0 = Math.floor((90 - la) / deg) - (N >> 1);
      const c0 = Math.floor((lo + 180) / deg) - (N >> 1);
      const k = `${r0}/${c0}`;
      if (k === key && !(tentarDeNovoEm && Date.now() >= tentarDeNovoEm)) return;
      tentarDeNovoEm = 0;
      key = k;
      const my = ++pending;
      // Se algo falhar (bloco ilegível, sem memória para a superfície), esquece a chave para
      // tentar de novo na próxima posição. Antes ficava presa e a janela não carregava (20/11/2026).
      const falhou = () => {
        if (my === pending) key = '';
      };
      const chaves = [...Array(N * N)].map((_, i) => [r0 + Math.floor(i / N), c0 + (i % N)] as const);
      Promise.all(chaves.map(([r, c]) => img(r, c))).then((ims) => {
        if (my !== pending) return;
        // Guarda só os blocos do mosaico atual: o cache não cresce durante voos longos.
        const atuais = new Set(chaves.map(([r, c]) => `${dir}/${r}_${c}`));
        for (const k2 of cache.keys()) if (!atuais.has(k2)) cache.delete(k2);
        const faltando = chaves.filter((_, i) => ims[i] === PENDENTE);
        for (const [r, c] of faltando) cache.delete(`${dir}/${r}_${c}`);
        if (faltando.length) tentarDeNovoEm = Date.now() + 5000;
        const surface = Skia.Surface.Make(px, px);
        if (!surface) return falhou();
        const canvas = surface.getCanvas();
        const paint = Skia.Paint();
        canvas.clear(Skia.Color('transparent'));
        ims.forEach((im, i) => {
          if (!im || im === PENDENTE) return;
          const dst = Skia.XYWHRect((i % N) * cell, Math.floor(i / N) * cell, cell, cell);
          canvas.drawImageRect(im, Skia.XYWHRect(0, 0, im.width(), im.height()), dst, paint);
        });
        surface.flush();
        const snap = surface.makeImageSnapshot();
        onChange({ image: snap.makeNonTextureImage() ?? snap, b: [c0 * deg - 180, 90 - r0 * deg, N * deg] });
      }, falhou);
    },
  };
}
