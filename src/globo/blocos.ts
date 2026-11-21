import { Skia, type SkData, type SkImage } from '@shopify/react-native-skia';
import { Directory, File, Paths } from 'expo-file-system';

import { env } from '@/config/env';
import { PASTA_NO_APARELHO, caminhoDoBloco, caminhoNoAparelho, type Camada as CamadaDaPaisagem } from '@/domain/voos/blocosDaRota';

/**
 * Blocos de imagem da NASA (GIBS, projeção geográfica EPSG:4326) para o globo.
 *
 * - Dia: Blue Marble Next Generation, 500 m por pixel no nível 7.
 * - Noite: Black Marble (VIIRS, 2016), mesma grade.
 *
 * Grade: blocos de 512 px; no nível z, cada bloco cobre 288 / 2^z graus. A linha 0 começa na
 * latitude 90 e a coluna 0 na longitude −180.
 *
 * De perto (níveis 8 a 10, desde 21/11/2026), o globo usa os mesmos blocos da paisagem da janela,
 * do Sentinel-2 (ESA WorldCover 2021): dia `w8`/`w10` (61 m por pixel no nível 10) e luzes `l9`
 * (área construída × luz real). Ficam na mesma pasta do aparelho que a janela usa. Só com o R2.
 *
 * Vêm de uma cópia no Cloudflare R2 (`EXPO_PUBLIC_TILES_BASE_URL`), recomprimida em WebP pelo
 * workflow "Blocos do globo" do coletor: o Black Marble do GIBS só existe em PNG (~300 KB por bloco,
 * ~30 KB em WebP) e o globo chegou a gastar 17 a 29 MB num voo de 25 min (build-38). Sem a URL do
 * R2 (desenvolvimento), vem direto do GIBS. Bloco noturno ausente no R2 (404) = sem luzes (oceano).
 */

const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best';
/** Último nível do Blue/Black Marble (500 m por pixel). */
export const NIVEL_NASA = 7;
/** Com o R2, o zoom vai até o nível 10 (blocos do Sentinel-2); sem ele, para no 7. */
export const NIVEL_MAX = env.tilesBaseUrl ? 10 : NIVEL_NASA;
const TAM = 512;

export type Camada = 'dia' | 'noite';

const doR2 = (camada: Camada) => (z: number, r: number, c: number) => `${env.tilesBaseUrl}/globo/${camada}/${z}/${r}/${c}.webp`;

const doGibs: Record<Camada, (z: number, r: number, c: number) => string> = {
  dia: (z, r, c) => `${GIBS}/BlueMarble_NextGeneration/default/default/500m/${z}/${r}/${c}.jpeg`,
  noite: (z, r, c) => `${GIBS}/VIIRS_Black_Marble/default/2016-01-01/500m/${z}/${r}/${c}.png`,
};

const url: Record<Camada, (z: number, r: number, c: number) => string> = env.tilesBaseUrl
  ? { dia: doR2('dia'), noite: doR2('noite') }
  : doGibs;

export const grausDoBloco = (z: number) => 288 / 2 ** z;

/** Nível do mosaico de dia para o nível de zoom: 1–7 NASA; 8 e 9 usam `w8`; 10 usa `w10`. */
export function nivelDoDia(z: number): number {
  'worklet';
  return z <= NIVEL_NASA ? z : z < 10 ? 8 : 10;
}

/** Nível do mosaico de longe (sempre NASA: cobre o mar, onde não há bloco do Sentinel-2). */
export function nivelDeLonge(z: number): number {
  'worklet';
  return Math.min(NIVEL_NASA, Math.max(1, z - 2));
}

/** Nível do mosaico da noite: Black Marble até o 7; de perto, as luzes `l9`. */
export function nivelDaNoite(z: number): number {
  'worklet';
  return z <= NIVEL_NASA ? Math.max(1, z - 1) : 9;
}

/** O bloco deste nível vem do Sentinel-2 (camadas da paisagem), não do Blue/Black Marble? */
export const doSentinel = (z: number) => z > NIVEL_NASA;

function camadaDaPaisagem(camada: Camada, z: number): CamadaDaPaisagem {
  if (camada === 'noite') return 'l9';
  return z >= 10 ? 'w10' : 'w8';
}

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

async function daPaisagem(camada: Camada, z: number, r: number, c: number): Promise<SkData | null> {
  const b = { camada: camadaDaPaisagem(camada, z), linha: r, coluna: c };
  const arquivo = new File(Paths.cache, caminhoNoAparelho(b));
  try {
    if (arquivo.exists) return arquivo.size > 0 ? Skia.Data.fromBytes(await arquivo.bytes()) : null;
  } catch {
    // arquivo ilegível: baixa de novo
  }
  const resposta = await fetch(`${env.tilesBaseUrl}/${caminhoDoBloco(b)}`);
  if (resposta.status !== 200 && resposta.status !== 404) return null;
  try {
    new Directory(Paths.cache, `${PASTA_NO_APARELHO}/${b.camada}/${b.linha}`).create({ intermediates: true, idempotent: true });
  } catch {
    // sem pasta: usa só da memória
  }
  if (resposta.status === 404) {
    // Sem bloco: mar aberto (dia) ou sem luz (noite). Guarda vazio para não pedir de novo.
    try {
      arquivo.create({ overwrite: true });
    } catch {
      // só não fica guardado
    }
    return null;
  }
  const bytes = new Uint8Array(await resposta.arrayBuffer());
  try {
    await arquivo.write(bytes);
  } catch {
    // sem espaço: usa só da memória
  }
  return Skia.Data.fromBytes(bytes);
}

async function doAparelhoOuDaRede(camada: Camada, z: number, r: number, c: number): Promise<SkData | null> {
  if (doSentinel(z)) return daPaisagem(camada, z, r, c);
  conferirPasta();
  const arquivo = new File(Paths.cache, `${PASTA}/${camada}_${z}_${r}_${c}`);
  try {
    if (arquivo.exists) return arquivo.size > 0 ? Skia.Data.fromBytes(await arquivo.bytes()) : null;
  } catch {
    // arquivo ilegível: baixa de novo
  }
  const resposta = await fetch(url[camada](z, r, c));
  if (resposta.status === 404) {
    // Sem bloco (noite sobre o oceano): guarda vazio para não pedir de novo.
    try {
      arquivo.create({ overwrite: true });
    } catch {
      // só não fica guardado
    }
    return null;
  }
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
/** `sentinel`: o mosaico veio dos blocos do Sentinel-2 (o shader ajusta a cor e lê as luzes de outro jeito). */
export type Mosaico = { imagem: SkImage | null; b: Limites; sentinel: boolean };
export const FORA: Limites = [1e3, 1e3, 1];

const N = 4;

/**
 * Lado do mosaico em blocos. A noite de perto usa as luzes `l9` (nível 9, 0,56° por bloco): com 4×4
 * cobria só 2,25° e, com o zoom nos níveis 8 e 9, a borda da tela caía no Black Marble borrado
 * (build-40, Milão). Com 8×8 cobre 4,5°, como o mosaico de dia do nível 8.
 */
export const ladoDoMosaico = (camada: Camada, z: number) => (camada === 'noite' && doSentinel(z) ? 8 : N);

/** Linha e coluna do canto do mosaico 4×4 centrado num ponto. */
export function cantoDoMosaico(z: number, lat: number, lon: number, lado?: number): [number, number] {
  'worklet';
  // Sem valor padrão que leia variável de fora: no worklet, o padrão é avaliado antes de a variável
  // capturada existir e o app fecha ao abrir o globo (build-41).
  const l = lado ?? 4;
  const deg = 288 / 2 ** z;
  return [Math.floor((90 - lat) / deg) - (l >> 1) + 1, Math.floor((lon + 180) / deg) - (l >> 1) + 1];
}

/**
 * Mosaico 4×4 de blocos em volta de um ponto, montado numa textura de `px` × `px`.
 * Só remonta quando muda o nível ou o bloco central.
 */
export function criarMosaico(camada: Camada, px: number, aoMudar: (m: Mosaico) => void) {
  let chave = '';
  let pedido = 0;
  return {
    atualizar(z: number, lat: number, lon: number) {
      const lado = ladoDoMosaico(camada, z);
      const celula = px / lado;
      const [r0, c0] = cantoDoMosaico(z, lat, lon, lado);
      const k = `${z}/${r0}/${c0}`;
      if (k === chave) return;
      chave = k;
      const meu = ++pedido;
      const deg = grausDoBloco(z);
      const linhas = Math.ceil(180 / deg);
      const colunas = Math.ceil(360 / deg);
      const blocos = [...Array(lado * lado)].map((_, i) => {
        const r = r0 + Math.floor(i / lado);
        const c = c0 + (i % lado);
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
          const dst = Skia.XYWHRect((i % lado) * celula, Math.floor(i / lado) * celula, celula, celula);
          canvas.drawImageRect(im, Skia.XYWHRect(0, 0, im.width(), im.height()), dst, paint);
        });
        surface.flush();
        const snap = surface.makeImageSnapshot();
        aoMudar({ imagem: snap.makeNonTextureImage() ?? snap, b: [c0 * deg - 180, 90 - r0 * deg, lado * deg], sentinel: doSentinel(z) });
      });
    },
  };
}
