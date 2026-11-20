/**
 * Sons de fundo do voo (PRD: RF-18, RN-18; Figma 04D "Som da cabine").
 * Econômica: motores e ruído branco. Primeira classe: também cabine, chuva e lofi.
 */
import type { Classe } from '../sessao/duracao';

export const SONS = ['motores', 'ruido-branco', 'cabine', 'chuva', 'lofi'] as const;
export type Som = (typeof SONS)[number];

export const SOM_PREMIUM: Record<Som, boolean> = {
  motores: false,
  'ruido-branco': false,
  cabine: true,
  chuva: true,
  lofi: true,
};

/** Lofi ainda não tem faixa (falta a fonte sem copyright). */
export const SOM_PRONTO: Record<Som, boolean> = {
  motores: true,
  'ruido-branco': true,
  cabine: true,
  chuva: true,
  lofi: false,
};

export const somLiberado = (s: Som, classe: Classe) => !SOM_PREMIUM[s] || classe === 'primeira';

export const VOLUME_PADRAO = 0.6;

/**
 * O som que toca: o escolhido, se existe, está pronto e é da classe do usuário; `null` = sem som.
 * Se a assinatura acabar, volta para os motores sem apagar a escolha salva.
 */
export function somEmUso(escolhido: string | null, classe: Classe): Som | null {
  if (escolhido === 'nenhum') return null;
  const s = SONS.find((x) => x === escolhido);
  if (!s) return 'motores';
  if (!SOM_PRONTO[s] || !somLiberado(s, classe)) return 'motores';
  return s;
}
