/**
 * Nuvens reais na janela (coleta "Nuvens" no repositório do coletor, a cada 3 h).
 *
 * No R2: `nuvens/{dia|noite}/{linha}/{coluna}.webp`, 20 × 10 blocos de 18° (nível 4 da grade
 * EPSG:4326 do GIBS, linha 0 em 90° N, coluna 0 em 180° O), cinza: 0 = céu limpo, 255 = nuvem.
 * "dia" e "noite" são as duas passagens diárias do satélite (VIIRS, ~13h30 e ~1h30 locais).
 * A janela monta um mosaico 2×2 em volta do avião (36° × 36°, ~4 km por pixel).
 */
import { interpolar, distanciaKm, type Ponto } from '../voos/geo';

export const GRAUS_POR_BLOCO_DE_NUVEM = 18;
const LINHAS = 10;
const COLUNAS = 20;

export type Passagem = 'dia' | 'noite';
export const PASSAGENS: Passagem[] = ['dia', 'noite'];

export type BlocoDeNuvem = { linha: number; coluna: number };

/**
 * Mosaico 2×2 em volta de um ponto: o avião fica sempre a pelo menos 9° da borda.
 * `oeste` e `norte` são os limites do mosaico (sem dar a volta em ±180°, para seguir a conta do shader);
 * `blocos` vêm com a coluna já dentro de 0..19.
 */
export function mosaicoDeNuvens(p: Ponto): { oeste: number; norte: number; lado: number; blocos: BlocoDeNuvem[] } {
  const g = GRAUS_POR_BLOCO_DE_NUVEM;
  const r0 = Math.min(LINHAS - 2, Math.max(0, Math.round((90 - p.lat) / g) - 1));
  const c0 = Math.round((p.lon + 180) / g) - 1;
  const blocos: BlocoDeNuvem[] = [];
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      blocos.push({ linha: r0 + i, coluna: (((c0 + j) % COLUNAS) + COLUNAS) % COLUNAS });
    }
  }
  return { oeste: c0 * g - 180, norte: 90 - r0 * g, lado: 2 * g, blocos };
}

/** Blocos de nuvem para toda a rota (os mosaicos de cada ponto, sem repetir). */
export function nuvensDaRota(de: Ponto, ate: Ponto, passoKm = 100): BlocoDeNuvem[] {
  const passos = Math.max(1, Math.ceil(distanciaKm(de, ate) / passoKm));
  const vistos = new Set<string>();
  const out: BlocoDeNuvem[] = [];
  for (let k = 0; k <= passos; k++) {
    for (const b of mosaicoDeNuvens(interpolar(de, ate, k / passos)).blocos) {
      const chave = `${b.linha}/${b.coluna}`;
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      out.push(b);
    }
  }
  return out;
}

export const caminhoDaNuvem = (passagem: Passagem, b: BlocoDeNuvem) => `nuvens/${passagem}/${b.linha}/${b.coluna}.webp`;

const suave = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Quanto usar a passagem noturna (0 = só a diurna, 1 = só a noturna): a que passou mais perto
 * no tempo. Pela hora solar local, a noturna (~1h30) é a mais recente entre 1h30 e 13h30; a
 * diurna (~13h30), entre 13h30 e 1h30. Troca suave em 1 h para não "piscar".
 */
export function pesoDaPassagemNoturna(lon: number, instante: number): number {
  const horaUtc = (instante / 3_600_000) % 24;
  const h = (((horaUtc + lon / 15) % 24) + 24) % 24;
  return suave(1, 2, h) * (1 - suave(13, 14, h));
}
