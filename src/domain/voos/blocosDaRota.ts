/**
 * Quais blocos de paisagem baixar no embarque (ARCHITECTURE §9, "Blocos da janela").
 *
 * Grade EPSG:4326 do GIBS: no nível z, cada bloco cobre 288/2^z graus; a linha 0 começa em 90° N
 * e a coluna 0 em 180° O. A janela monta um mosaico 4×4 em volta do avião (src/janela/tiles.ts),
 * então aqui juntamos esse mesmo 4×4 em cada ponto da rota, da posição atual até o destino.
 * Bloco que não existe no R2 é oceano: o download trata o 404 como "nada a baixar".
 */
import { distanciaKm, interpolar, type Ponto } from './geo';

export type Camada = 'w10' | 'w8' | 'i9';

/** Camadas da janela e o nível de cada uma (iguais às de src/janela/Janela.tsx). */
export const CAMADAS: { camada: Camada; z: number }[] = [
  { camada: 'w10', z: 10 }, // Landsat 61 m, perto do avião
  { camada: 'w8', z: 8 }, // Landsat 244 m, distância média
  { camada: 'i9', z: 9 }, // áreas construídas, cidades à noite
];

/** Lado do mosaico em blocos (mesmo N do atlas da janela). */
export const LADO_DO_MOSAICO = 4;

export type Bloco = { camada: Camada; linha: number; coluna: number };

export const grausPorBloco = (z: number) => 288 / 2 ** z;

/** Linhas e colunas do mosaico 4×4 em volta de um ponto (a coluna dá a volta em ±180°). */
export function mosaicoEmVolta(p: Ponto, z: number): { linha: number; coluna: number }[] {
  const g = grausPorBloco(z);
  const linhas = Math.round(180 / g);
  const colunas = Math.round(360 / g);
  const metade = LADO_DO_MOSAICO >> 1;
  const r0 = Math.floor((90 - p.lat) / g) - metade;
  const c0 = Math.floor((p.lon + 180) / g) - metade;
  const out: { linha: number; coluna: number }[] = [];
  for (let i = 0; i < LADO_DO_MOSAICO; i++) {
    const linha = r0 + i;
    if (linha < 0 || linha >= linhas) continue;
    for (let j = 0; j < LADO_DO_MOSAICO; j++) {
      const coluna = (((c0 + j) % colunas) + colunas) % colunas;
      out.push({ linha, coluna });
    }
  }
  return out;
}

/**
 * Blocos de todas as camadas ao longo do grande círculo de `de` até `ate`.
 * Amostra a rota a cada `passoKm` (menor que o menor bloco, ~31 km no nível 10), sem repetir blocos.
 */
export function blocosDaRota(de: Ponto, ate: Ponto, camadas = CAMADAS, passoKm = 10): Bloco[] {
  const total = distanciaKm(de, ate);
  const passos = Math.max(1, Math.ceil(total / passoKm));
  const vistos = new Set<string>();
  const blocos: Bloco[] = [];
  for (let k = 0; k <= passos; k++) {
    const p = interpolar(de, ate, k / passos);
    for (const { camada, z } of camadas) {
      for (const { linha, coluna } of mosaicoEmVolta(p, z)) {
        const chave = `${camada}/${linha}/${coluna}`;
        if (vistos.has(chave)) continue;
        vistos.add(chave);
        blocos.push({ camada, linha, coluna });
      }
    }
  }
  return blocos;
}

/** Caminho do bloco no R2 e no cache do aparelho. */
export const caminhoDoBloco = (b: Bloco) => `blocos/${b.camada}/${b.linha}/${b.coluna}.webp`;

/**
 * A janela aguenta até 5% de blocos que não baixaram (aparecem sem terra naquele trecho).
 * Acima disso, a tela de embarque oferece "Embarcar com o globo" (UC-02 A4).
 */
export const blocosSuficientes = (total: number, falhas: number) => total > 0 && falhas <= Math.floor(total * 0.05);

/** Minutos de rota que o embarque baixa antes de abrir a janela; o resto baixa durante o voo. */
export const MINUTOS_NO_EMBARQUE = 40;

/**
 * Divide os blocos da rota: os primeiros `MINUTOS_NO_EMBARQUE` (até `pontoNoLimite`) são baixados no
 * embarque; os do resto da rota baixam já com o usuário a bordo (voos longos embarcavam devagar, 20/11/2026).
 */
export function dividirBlocos(aviao: Ponto, pontoNoLimite: Ponto, destino: Ponto): { noEmbarque: Bloco[]; duranteOVoo: Bloco[] } {
  const noEmbarque = blocosDaRota(aviao, pontoNoLimite);
  const ja = new Set(noEmbarque.map(caminhoDoBloco));
  const duranteOVoo = blocosDaRota(pontoNoLimite, destino).filter((b) => !ja.has(caminhoDoBloco(b)));
  return { noEmbarque, duranteOVoo };
}
