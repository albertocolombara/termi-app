/**
 * Sons de fundo do voo (PRD: RF-18, RN-18; Figma 04D "Som da cabine").
 * Econômica: voo de cruzeiro (ruído marrom) e ruído branco. Primeira classe: também motores, cabine,
 * chuva e lofi (decidido pelo Alberto em 20/11/2026: o motor gravado virou primeira classe, e o som
 * grátis passou a ser gerado, sem licença de terceiros).
 * O lofi não vem no APK: é uma playlist no servidor, tocada em streaming (services/audio).
 */
import type { Classe } from '../sessao/duracao';

export const SONS = ['cruzeiro', 'ruido-branco', 'motores', 'cabine', 'chuva', 'lofi'] as const;
export type Som = (typeof SONS)[number];

export const SOM_PREMIUM: Record<Som, boolean> = {
  cruzeiro: false,
  motores: true,
  'ruido-branco': false,
  cabine: true,
  chuva: true,
  lofi: true,
};

export const SOM_PRONTO: Record<Som, boolean> = {
  cruzeiro: true,
  motores: true,
  'ruido-branco': true,
  cabine: true,
  chuva: true,
  lofi: true,
};

export const somLiberado = (s: Som, classe: Classe) => !SOM_PREMIUM[s] || classe === 'primeira';

export const VOLUME_PADRAO = 0.6;

/** O som de quem ainda não escolheu e de quem não pode usar o escolhido. */
export const SOM_PADRAO: Som = 'cruzeiro';

/**
 * O som que toca: o escolhido, se existe, está pronto e é da classe do usuário; `null` = sem som.
 * Se a assinatura acabar, volta para o voo de cruzeiro sem apagar a escolha salva.
 */
export function somEmUso(escolhido: string | null, classe: Classe): Som | null {
  if (escolhido === 'nenhum') return null;
  const s = SONS.find((x) => x === escolhido);
  if (!s) return SOM_PADRAO;
  if (!SOM_PRONTO[s] || !somLiberado(s, classe)) return SOM_PADRAO;
  return s;
}
