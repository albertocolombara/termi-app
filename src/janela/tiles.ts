import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import { Skia, SkImage } from '@shopify/react-native-skia';

// Blocos da rota: primeiro os baixados do R2 no embarque; senão, os pacotes do protótipo
// (Barcelona → Londres), que ainda vêm no APK para a tela de teste e saem antes do lançamento.
const INDEX: Record<string, [string, number, number]> = require('../../assets/janela/pk/index.json');

const PACKS: Record<string, number> = {
  'pk/w10_22.bin': require('../../assets/janela/pk/w10_22.bin'),
  'pk/w10_23.bin': require('../../assets/janela/pk/w10_23.bin'),
  'pk/w10_24.bin': require('../../assets/janela/pk/w10_24.bin'),
  'pk/w10_25.bin': require('../../assets/janela/pk/w10_25.bin'),
  'pk/w10_26.bin': require('../../assets/janela/pk/w10_26.bin'),
  'pk/w10_27.bin': require('../../assets/janela/pk/w10_27.bin'),
  'pk/w10_28.bin': require('../../assets/janela/pk/w10_28.bin'),
  'pk/w10_29.bin': require('../../assets/janela/pk/w10_29.bin'),
  'pk/w8_8.bin': require('../../assets/janela/pk/w8_8.bin'),
  'pk/w8_9.bin': require('../../assets/janela/pk/w8_9.bin'),
  'pk/w8_10.bin': require('../../assets/janela/pk/w8_10.bin'),
  'pk/w8_11.bin': require('../../assets/janela/pk/w8_11.bin'),
  'pk/i9_16.bin': require('../../assets/janela/pk/i9_16.bin'),
  'pk/i9_17.bin': require('../../assets/janela/pk/i9_17.bin'),
  'pk/i9_18.bin': require('../../assets/janela/pk/i9_18.bin'),
  'pk/i9_19.bin': require('../../assets/janela/pk/i9_19.bin'),
  'pk/i9_20.bin': require('../../assets/janela/pk/i9_20.bin'),
  'pk/i9_21.bin': require('../../assets/janela/pk/i9_21.bin'),
  'pk/i9_22.bin': require('../../assets/janela/pk/i9_22.bin'),
};

const packFiles = new Map<string, Promise<File | null>>();

function packFile(name: string) {
  if (!packFiles.has(name)) {
    const mod = PACKS[name];
    packFiles.set(
      name,
      mod
        ? Asset.fromModule(mod)
            .downloadAsync()
            .then((a) => (a.localUri ? new File(a.localUri) : null))
            .catch(() => null)
        : Promise.resolve(null),
    );
  }
  return packFiles.get(name)!;
}

const decodificar = (bytes: Uint8Array) => Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(bytes));

/**
 * Bloco baixado no embarque (data/blocos), em `cache/blocos/{camada}/{linha}/{coluna}.webp`.
 * Arquivo vazio = oceano (404 no R2). `undefined` = não baixado: cai nos pacotes do protótipo.
 */
async function blocoBaixado(key: string): Promise<SkImage | null | undefined> {
  const [camada, rc] = key.split('/');
  const [linha, coluna] = rc.split('_');
  const f = new File(Paths.cache, `blocos/${camada}/${linha}/${coluna}.webp`);
  if (!f.exists) return undefined;
  if (f.size === 0) return null;
  try {
    return decodificar(await f.bytes());
  } catch {
    return null;
  }
}

async function tile(key: string): Promise<SkImage | null> {
  const baixado = await blocoBaixado(key);
  if (baixado !== undefined) return baixado;
  const ix = INDEX[key];
  if (!ix) return null;
  const [p, offset, length] = ix;
  const f = await packFile(p);
  if (!f) return null;
  try {
    const h = f.open();
    h.offset = offset;
    const bytes = await h.readBytes(length);
    h.close();
    return decodificar(bytes);
  } catch {
    return null;
  }
}

export type AtlasState = { image: SkImage | null; b: [number, number, number] };

const N = 4;

/**
 * Monta um mosaico 4×4 de blocos em volta do avião, como no protótipo web.
 * Só remonta quando o avião muda de bloco.
 */
export function makeAtlas(
  dir: 'w10' | 'w8' | 'i9',
  z: number,
  px: number,
  onChange: (s: AtlasState) => void,
) {
  const cell = px / N;
  const deg = 288 / 2 ** z;
  const cache = new Map<string, Promise<SkImage | null>>();
  let key = '';
  let pending = 0;
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
      if (k === key) return;
      key = k;
      const my = ++pending;
      Promise.all([...Array(N * N)].map((_, i) => img(r0 + Math.floor(i / N), c0 + (i % N)))).then((ims) => {
        if (my !== pending) return;
        const surface = Skia.Surface.Make(px, px);
        if (!surface) return;
        const canvas = surface.getCanvas();
        const paint = Skia.Paint();
        canvas.clear(Skia.Color('transparent'));
        ims.forEach((im, i) => {
          if (!im) return;
          const dst = Skia.XYWHRect((i % N) * cell, Math.floor(i / N) * cell, cell, cell);
          canvas.drawImageRect(im, Skia.XYWHRect(0, 0, im.width(), im.height()), dst, paint);
        });
        surface.flush();
        const snap = surface.makeImageSnapshot();
        onChange({ image: snap.makeNonTextureImage() ?? snap, b: [c0 * deg - 180, 90 - r0 * deg, N * deg] });
      });
    },
  };
}
