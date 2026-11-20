/**
 * Como a sessão termina. PRD: RN-08, RN-09, RN-09a, RN-10; UC-04 E4, UC-06, UC-08.
 * O fim vira o `FimDoVoo` que `rendimentos` usa. Milhas = distância real voada até o fim.
 */
import { milhasVoadas } from '../voos/projecao';
import type { Voo } from '../voos/tipos';
import type { FimDoVoo } from './rendimentos';

type Base = { voo: Voo; embarcouEm: number; pousoPrevistoEm: number };

/** Pousar antes (UC-06): o fim é agora, e só conta o trecho voado até aqui. */
export function fimPousandoAntes(s: Base, agora: number): FimDoVoo {
  const encerrouEm = Math.min(agora, s.pousoPrevistoEm);
  return { tipo: 'pousar-antes', embarcouEm: s.embarcouEm, encerrouEm, milhas: milhasVoadas(s.voo, s.embarcouEm, encerrouEm) };
}

/**
 * Pouso completo no horário (RN-09). Se o app ficou fechado, o fim é o horário de pouso, não a hora
 * em que o app abriu: os minutos não crescem por o usuário ter demorado a voltar.
 * Com "Continuar até o pouso" (RN-09a), o fim é `ate` (quando o usuário tocou em "Pousar agora" ou o avião pousou).
 */
export function fimPousando(s: Base, ate?: number): FimDoVoo {
  const encerrouEm = ate !== undefined ? Math.max(ate, s.pousoPrevistoEm) : s.pousoPrevistoEm;
  return { tipo: 'pouso', embarcouEm: s.embarcouEm, pousoPrevistoEm: s.pousoPrevistoEm, encerrouEm, milhas: milhasVoadas(s.voo, s.embarcouEm, encerrouEm) };
}

/** A sessão já deve virar pouso ao abrir a tela? (o horário escolhido passou). */
export const tempoCumprido = (pousoPrevistoEm: number, agora: number) => agora >= pousoPrevistoEm;
