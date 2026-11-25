/**
 * O avião real ainda está no ar? Usado no horário de pouso do usuário (RN-09a, Em espera) e durante
 * "Continuar até o pouso". PRD: RN-09, RN-09a.
 *
 * Só diz "no ar" com uma leitura recente do radar: na dúvida, o voo pousa no horário do usuário
 * (pouso completo garantido) em vez de oferecer minutos a mais com base numa estimativa.
 */
import type { Voo } from './tipos';
import type { AviaoReal } from '../sessao/estado';

/** Situação da última busca do avião (a mesma de `Radar` na tela em voo). */
export type SituacaoDoRadar = 'ok' | 'fora-da-area' | 'sem-sinal' | 'sem-internet';

/** Abaixo disso, com o avião perto do destino, conta como pousado. */
const ALTITUDE_DE_SOLO_PES = 300;
const PERTO_DO_DESTINO_KM = 10;
/** Leitura mais velha que isso não serve para dizer que o avião está no ar. */
export const LEITURA_RECENTE_MS = 30 * 60_000;

export function aviaoReal(ultimo: Voo, radar: SituacaoDoRadar, agora: number): AviaoReal {
  const noSolo =
    ultimo.distanciaRestanteKm <= PERTO_DO_DESTINO_KM && (ultimo.altitudePes === null || ultimo.altitudePes <= ALTITUDE_DE_SOLO_PES);
  if (noSolo) return 'pousou';
  const recente = agora - ultimo.coletadoEm <= LEITURA_RECENTE_MS;
  if (radar === 'ok' && recente) return 'no-ar';
  // Sem leitura nova: depois da previsão de pouso do avião real, conta como pousado
  // (encerra "Continuar até o pouso"); antes dela, não dá para saber.
  return agora >= ultimo.pousoPrevistoEm ? 'pousou' : 'desconhecido';
}
