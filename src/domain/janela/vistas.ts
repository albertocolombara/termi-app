/**
 * Vistas da janela (PRD: RF-19, RN-18, RN-20; visão §3 "A janela").
 * O céu lá fora é sempre o real; a vista só muda o que aparece na janela (asa, motor, moldura).
 */
import type { Classe } from '../sessao/duracao';

/**
 * Vistas do lançamento (decisão do Alberto, 24/11/2026): Janela (grátis), Asa e Sem moldura (Plus).
 * "Com asa" e "Asa e motor" saíram por enquanto; quem tinha uma delas salva volta para Janela.
 * Os nomes internos continuam os antigos, para a escolha salva no aparelho seguir valendo.
 */
export const VISTAS = ['so-janela', 'asa-completa', 'sem-moldura'] as const;
export type Vista = (typeof VISTAS)[number];

/** Camadas do Blender em cada vista. */
export const CAMADAS_DA_VISTA: Record<Vista, { asa: boolean; moldura: boolean; pronta: boolean }> = {
  'so-janela': { asa: false, moldura: true, pronta: true },
  'asa-completa': { asa: true, moldura: true, pronta: true },
  'sem-moldura': { asa: true, moldura: false, pronta: true },
};

/** Só a Janela é grátis; Asa e Sem moldura são do Plus (RN-18). */
export const vistaPremium = (v: Vista) => v !== 'so-janela';

export const vistaLiberada = (v: Vista, classe: Classe) => !vistaPremium(v) || classe === 'primeira';

/**
 * A vista que a janela mostra: a escolhida, se ela existe e é da classe do usuário; senão, Só a janela.
 * Se a assinatura acabar, a janela volta para Só a janela sem apagar a escolha salva.
 */
export function vistaEmUso(escolhida: string | null, classe: Classe): Vista {
  const v = VISTAS.find((x) => x === escolhida);
  if (!v || !CAMADAS_DA_VISTA[v].pronta || !vistaLiberada(v, classe)) return 'so-janela';
  return v;
}
