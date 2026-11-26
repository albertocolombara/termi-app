/**
 * Voos reais usados nas ilustrações do onboarding (OB1, OB5, OB7, OB10). Só leem o cache; nunca
 * consultam o provedor (CLAUDE.md §7). Funções puras: recebem a lista e a hora.
 */
import { minutosAtePouso } from '@/domain/voos/elegibilidade';
import { projetar } from '@/domain/voos/projecao';
import type { Voo } from '@/domain/voos/tipos';

const sem = (v: Voo) => !v.origem || !v.destino;

/** Um avião por hex (o mesmo avião pode vir em duas regiões). */
export function semRepetidos(voos: readonly Voo[]): Voo[] {
  const vistos = new Set<string>();
  return voos.filter((v) => (vistos.has(v.hex) ? false : (vistos.add(v.hex), true)));
}

/** Quantos aviões estão no ar agora no cache (contador do OB1). */
export const avioesNoAr = (voos: readonly Voo[], agora: number) => semRepetidos(voos).filter((v) => v.pousoPrevistoEm > agora).length;

/** Posições e rumos para desenhar no globo do OB1, limitados para não pesar o quadro. */
export function avioesParaOGlobo(voos: readonly Voo[], agora: number, max = 90): { lat: number; lon: number; rumo: number }[] {
  const lista = semRepetidos(voos).filter((v) => v.pousoPrevistoEm > agora);
  // Amostra espalhada pela lista (não só os primeiros da mesma região).
  const passo = Math.max(1, lista.length / max);
  const out: { lat: number; lon: number; rumo: number }[] = [];
  for (let i = 0; i < lista.length && out.length < max; i += passo) {
    const p = projetar(lista[Math.floor(i)], agora);
    out.push({ lat: p.lat, lon: p.lon, rumo: p.rumo });
  }
  return out;
}

/** Bom para mostrar: no ar, em cruzeiro, com cidades e companhia, e ainda longe do pouso. */
function apresentavel(v: Voo, agora: number, minMin = 45) {
  const min = minutosAtePouso(v, agora);
  return (
    !sem(v) &&
    min >= minMin &&
    (v.altitudePes ?? 0) >= 25_000 &&
    !!v.companhiaNome &&
    !!(v.origem.cidade ?? v.origem.nome) &&
    !!(v.destino.cidade ?? v.destino.nome) &&
    v.origem.pais !== null &&
    v.destino.pais !== null
  );
}

/**
 * Voo em destaque do OB1: o de rota mais longa que ainda tem pelo menos 45 min de voo,
 * de preferência entre países diferentes (fica bonito no globo).
 */
export function vooEmDestaque(voos: readonly Voo[], agora: number): Voo | null {
  const bons = semRepetidos(voos).filter((v) => apresentavel(v, agora));
  if (!bons.length) return null;
  const internacionais = bons.filter((v) => v.origem.pais !== v.destino.pais);
  const lista = internacionais.length ? internacionais : bons;
  return [...lista].sort((a, b) => b.distanciaRestanteKm - a.distanciaRestanteKm || a.hex.localeCompare(b.hex))[0];
}

/**
 * Voo da janela do OB10: de dia ou no pôr/nascer do sol (de noite a janela fica escura).
 * `elevacaoDoSol` devolve a elevação em graus na posição e hora dadas.
 */
export function vooDaJanela(voos: readonly Voo[], agora: number, elevacaoDoSol: (lat: number, lon: number, ms: number) => number): Voo | null {
  const bons = semRepetidos(voos).filter((v) => apresentavel(v, agora, 20));
  if (!bons.length) return null;
  const comSol = bons.map((v) => {
    const p = projetar(v, agora);
    return { v, el: elevacaoDoSol(p.lat, p.lon, agora) };
  });
  // Hora dourada primeiro (sol entre 0° e 12°), depois o dia, por fim o que houver.
  const nota = (el: number) => (el >= 0 && el <= 12 ? 0 : el > 12 ? 1 : el > -4 ? 2 : 3);
  comSol.sort((a, b) => nota(a.el) - nota(b.el) || b.v.distanciaRestanteKm - a.v.distanciaRestanteKm || a.v.hex.localeCompare(b.v.hex));
  return comSol[0].v;
}

/** Momento do dia na janela, pela elevação do sol em graus. */
export type MomentoDoDia = 'dia' | 'por-do-sol' | 'nascer-do-sol' | 'noite';

export function momentoDoDia(elevacao: number, elevacaoDaquiAPouco: number): MomentoDoDia {
  if (elevacao > 12) return 'dia';
  if (elevacao < -6) return 'noite';
  return elevacaoDaquiAPouco < elevacao ? 'por-do-sol' : 'nascer-do-sol';
}

/**
 * Até `n` voos reais que pousam perto do tempo pedido (OB5), de companhias diferentes quando der.
 * A meta "6 h ou mais" usa 6 h. Ordem: mais perto do tempo primeiro.
 */
export function voosDeExemplo(voos: readonly Voo[], alvoMin: number, agora: number, n = 3): Voo[] {
  const candidatos = semRepetidos(voos)
    .filter((v) => !sem(v) && !!v.companhiaNome && !!v.companhiaPais && !!(v.origem.cidade ?? v.origem.nome) && !!(v.destino.cidade ?? v.destino.nome))
    .map((v) => ({ v, dif: Math.abs(minutosAtePouso(v, agora) - alvoMin) }))
    .filter((c) => c.dif <= Math.max(15, alvoMin * 0.15))
    .sort((a, b) => a.dif - b.dif || a.v.hex.localeCompare(b.v.hex));
  const escolhidos: Voo[] = [];
  const companhias = new Set<string>();
  for (const c of candidatos) {
    if (escolhidos.length >= n) break;
    if (companhias.has(c.v.companhiaNome!)) continue;
    companhias.add(c.v.companhiaNome!);
    escolhidos.push(c.v);
  }
  // Poucas companhias: completa com o que houver.
  for (const c of candidatos) {
    if (escolhidos.length >= n) break;
    if (!escolhidos.includes(c.v)) escolhidos.push(c.v);
  }
  return escolhidos;
}

/** Rotas reais para "passarem" no globo do OB7: as mais longas, sem repetir o par de cidades. */
export function rotasDeExemplo(voos: readonly Voo[], n = 10): { origem: { lat: number; lon: number }; destino: { lat: number; lon: number } }[] {
  const vistos = new Set<string>();
  return semRepetidos(voos)
    .filter((v) => !sem(v))
    .sort((a, b) => b.distanciaRestanteKm - a.distanciaRestanteKm || a.hex.localeCompare(b.hex))
    .filter((v) => {
      const k = `${v.origem.icao ?? v.origem.iata}-${v.destino.icao ?? v.destino.iata}`;
      return vistos.has(k) ? false : (vistos.add(k), true);
    })
    .slice(0, n)
    .map((v) => ({ origem: { lat: v.origem.lat, lon: v.origem.lon }, destino: { lat: v.destino.lat, lon: v.destino.lon } }));
}
