import { Skia, type SkData, type SkImage } from '@shopify/react-native-skia';
import { Directory, File, Paths } from 'expo-file-system';

/**
 * Blocos de imagem da NASA (GIBS, projeção geográfica EPSG:4326) para o globo.
 *
 * - Dia: Blue Marble Next Generation, 500 m por pixel no nível 7.
 * - Noite: Black Marble (VIIRS, 2016), mesma grade.
 *
 * Grade: blocos de 512 px; no nível z, cada bloco cobre 288 / 2^z graus. A linha 0 começa na
 * latitude 90 e a coluna 0 na longitude −180.
 *
 * No teste os blocos vêm direto do GIBS. Em produção vêm de uma cópia no Cloudflare R2
 * (`EXPO_PUBLIC_TILES_BASE_URL`), porque o GIBS não garante disponibilidade (ARCHITECTURE.md §9).
 */

const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best';
export const NIVEL_MAX = 7;
const TAM = 512;

export type Camada = 'dia' | 'noite';

const url: Record<Camada, (z: number, r: number, c: number) => string> = {
  dia: (z, r, c) => `${GIBS}/BlueMarble_NextGeneration/default/default/500m/${z}/${r}/${c}.jpeg`,
  noite: (z, r, c) => `${GIBS}/VIIRS_Black_Marble/default/2016-01-01/500m/${z}/${r}/${c}.png`,
};

export const grausDoBloco = (z: number) => 288 / 2 ** z;

/** Nível de detalhe para uma resolução de tela (km por pixel do aparelho). */
export function nivelPara(kmPorPixel: number): number {
  'worklet';
  const z = Math.floor(Math.log2((288 * 111.2) / (TAM * kmPorPixel)));
  return Math.max(1, Math.min(NIVEL_MAX, z));
}

// Cache dos arquivos baixados (comprimidos), não das imagens decodificadas: 1 bloco decodificado
// ocupa 1 MB, comprimido fica entre 40 e 300 KB.
const LIMITE_CACHE = 120;
const cache = new Map<string, Promise<SkData | null>>();

// Cópia no aparelho (build-37, consumo de dados): antes, cada abertura do globo baixava os
// blocos de novo. Passando de ~800 arquivos (~100 MB), a pasta é esvaziada e recomeça.
const PASTA = 'globo';
const LIMITE_ARQUIVOS = 800;
let pastaConferida = false;

function conferirPasta() {
  if (pastaConferida) return;
  pastaConferida = true;
  try {
    const pasta = new Directory(Paths.cache, PASTA);
    if (!pasta.exists) pasta.create({ intermediates: true, idempotent: true });
    else if (pasta.list().length > LIMITE_ARQUIVOS) {
      pasta.delete();
      pasta.create({ intermediates: true, idempotent: true });
    }
  } catch {
    // sem a cópia no aparelho, só baixa de novo
  }
}

async function doAparelhoOuDaRede(camada: Camada, z: number, r: number, c: number): Promise<SkData | null> {
  conferirPasta();
  const arquivo = new File(Paths.cache, `${PASTA}/${camada}_${z}_${r}_${c}`);
  try {
    if (arquivo.exists && arquivo.size > 0) return Skia.Data.fromBytes(await arquivo.bytes());
  } catch {
    // arquivo ilegível: baixa de novo
  }
  const resposta = await fetch(url[camada](z, r, c));
  if (!resposta.ok) return null;
  const bytes = new Uint8Array(await resposta.arrayBuffer());
  try {
    await arquivo.write(bytes);
  } catch {
    // sem espaço: usa só da memória
  }
  return Skia.Data.fromBytes(bytes);
}

function baixar(camada: Camada, z: number, r: number, c: number): Promise<SkData | null> {
  const k = `${camada}/${z}/${r}/${c}`;
  const atual = cache.get(k);
  if (atual) {
    cache.delete(k);
    cache.set(k, atual);
    return atual;
  }
  const p = doAparelhoOuDaRede(camada, z, r, c).catch(() => null);
  cache.set(k, p);
  if (cache.size > LIMITE_CACHE) cache.delete(cache.keys().next().value!);
  return p;
}

/** Retângulo do mosaico em graus: [lon oeste, lat norte, lado]. */
export type Limites = [number, number, number];
export type Mosaico = { imagem: SkImage | null; b: Limites };
export const FORA: Limites = [1e3, 1e3, 1];

const N = 4;

/** Linha e coluna do canto do mosaico 4×4 centrado num ponto. */
export function cantoDoMosaico(z: number, lat: number, lon: number): [number, number] {
  'worklet';
  const deg = 288 / 2 ** z;
  return [Math.floor((90 - lat) / deg) - (N >> 1) + 1, Math.floor((lon + 180) / deg) - (N >> 1) + 1];
}

/**
 * Mosaico 4×4 de blocos em volta de um ponto, montado numa textura de `px` × `px`.
 * Só remonta quando muda o nível ou o bloco central.
 */
export function criarMosaico(camada: Camada, px: number, aoMudar: (m: Mosaico) => void) {
  const celula = px / N;
  let chave = '';
  let pedido = 0;
  return {
    atualizar(z: number, lat: number, lon: number) {
      const [r0, c0] = cantoDoMosaico(z, lat, lon);
      const k = `${z}/${r0}/${c0}`;
      if (k === chave) return;
      chave = k;
      const meu = ++pedido;
      const deg = grausDoBloco(z);
      const linhas = Math.ceil(180 / deg);
      const colunas = Math.ceil(360 / deg);
      const blocos = [...Array(N * N)].map((_, i) => {
        const r = r0 + Math.floor(i / N);
        const c = c0 + (i % N);
        if (r < 0 || r >= linhas || c < 0 || c >= colunas) return Promise.resolve(null);
        return baixar(camada, z, r, c);
      });
      Promise.all(blocos).then((dados) => {
        if (meu !== pedido) return;
        const surface = Skia.Surface.Make(px, px);
        if (!surface) return;
        const canvas = surface.getCanvas();
        const paint = Skia.Paint();
        canvas.clear(Skia.Color('transparent'));
        dados.forEach((d, i) => {
          const im = d ? Skia.Image.MakeImageFromEncoded(d) : null;
          if (!im) return;
          const dst = Skia.XYWHRect((i % N) * celula, Math.floor(i / N) * celula, celula, celula);
          canvas.drawImageRect(im, Skia.XYWHRect(0, 0, im.width(), im.height()), dst, paint);
        });
        surface.flush();
        const snap = surface.makeImageSnapshot();
        aoMudar({ imagem: snap.makeNonTextureImage() ?? snap, b: [c0 * deg - 180, 90 - r0 * deg, N * deg] });
      });
    },
  };
}
