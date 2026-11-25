/**
 * Estatísticas do período (M4 · Figma v3). PRD: RF-35.
 * Filtros dia, semana, mês e ano para todos (decisão do Alberto no Figma v3, 24/11/2026); o Plus libera
 * os blocos a partir de "Por categoria".
 *
 * Os minutos de cada voo contam no momento do pouso (`encerrouEm`), no horário do aparelho.
 */
import { agendaDePausas, type IntervaloServicoDeBordo } from '@/domain/sessao/pausas';
import { CATEGORIAS, type Categoria } from '@/domain/sessao/motivo';

import { inicioDoPeriodo, type Periodo, type VooDoDiario } from './historico';

export type VooComServico = VooDoDiario & { intervaloServico: IntervaloServicoDeBordo };

export type Barra = { rotulo: string; minutos: number; atual: boolean };

export type Estatisticas = {
  minutos: number;
  /** Minutos do período anterior equivalente (semana passada, mês passado…). */
  minutosAnterior: number;
  voos: number;
  pousos: number;
  pousosAntes: number;
  /** Serviços de bordo que começaram durante os voos do período. */
  servicos: number;
  /** Dias seguidos com pelo menos um voo, até hoje (ou até ontem, se hoje ainda não voou). */
  sequencia: number;
  /** Maior sequência de dias seguidos de todo o histórico. */
  recorde: number;
  barras: Barra[];
  /** Minutos por categoria do motivo da viagem, da maior para a menor (só as que têm minutos). */
  categorias: { categoria: Categoria; minutos: number }[];
};

const DIA_MS = 86_400_000;
const SEMANA = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
const MESES = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

/** Começo do período anterior ao corrente (ontem, semana passada, mês passado, ano passado). */
export function inicioDoPeriodoAnterior(periodo: Periodo, agora: number): number {
  const d = new Date(inicioDoPeriodo(periodo, agora));
  if (periodo === 'dia') d.setDate(d.getDate() - 1);
  else if (periodo === 'semana') d.setDate(d.getDate() - 7);
  else if (periodo === 'mes') d.setMonth(d.getMonth() - 1);
  else d.setFullYear(d.getFullYear() - 1);
  return d.getTime();
}

/** Número do dia local (dias desde 1970 no horário do aparelho), para contar dias seguidos. */
function diaLocal(ms: number): number {
  const d = new Date(ms);
  return Math.round(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / DIA_MS);
}

export function sequencias(voos: readonly VooDoDiario[], agora: number): { sequencia: number; recorde: number } {
  const dias = [...new Set(voos.map((v) => diaLocal(v.encerrouEm)))].sort((a, b) => a - b);
  let recorde = 0;
  let atual = 0;
  for (let i = 0; i < dias.length; i++) {
    atual = i > 0 && dias[i] - dias[i - 1] === 1 ? atual + 1 : 1;
    recorde = Math.max(recorde, atual);
  }
  const hoje = diaLocal(agora);
  const ultimo = dias.at(-1);
  // A sequência continua viva se o último voo foi hoje ou ontem.
  const sequencia = ultimo !== undefined && hoje - ultimo <= 1 ? atual : 0;
  return { sequencia, recorde };
}

function servicosDoVoo(v: VooComServico): number {
  const voado = (v.encerrouEm - v.embarcouEm) / 60_000;
  return agendaDePausas(v.tempoEscolhidoMin, v.intervaloServico).filter((p) => p.inicioMin < voado).length;
}

function barras(voos: readonly VooDoDiario[], periodo: Periodo, agora: number): Barra[] {
  const inicio = new Date(inicioDoPeriodo(periodo, agora));
  const hoje = new Date(agora);
  if (periodo === 'dia') {
    const b = Array.from({ length: 8 }, (_, i) => ({ rotulo: `${i * 3}h`, minutos: 0, atual: Math.floor(hoje.getHours() / 3) === i }));
    for (const v of voos) b[Math.floor(new Date(v.encerrouEm).getHours() / 3)].minutos += v.minutosFoco;
    return b;
  }
  if (periodo === 'semana') {
    const b = SEMANA.map((rotulo, i) => ({ rotulo, minutos: 0, atual: (hoje.getDay() + 6) % 7 === i }));
    for (const v of voos) b[(new Date(v.encerrouEm).getDay() + 6) % 7].minutos += v.minutosFoco;
    return b;
  }
  if (periodo === 'mes') {
    const ultimoDia = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0).getDate();
    const semanas = Math.ceil(ultimoDia / 7);
    const b = Array.from({ length: semanas }, (_, i) => ({
      rotulo: `${i * 7 + 1}–${Math.min(ultimoDia, i * 7 + 7)}`,
      minutos: 0,
      atual: Math.floor((hoje.getDate() - 1) / 7) === i,
    }));
    for (const v of voos) b[Math.floor((new Date(v.encerrouEm).getDate() - 1) / 7)].minutos += v.minutosFoco;
    return b;
  }
  const b = MESES.map((rotulo, i) => ({ rotulo, minutos: 0, atual: hoje.getMonth() === i }));
  for (const v of voos) b[new Date(v.encerrouEm).getMonth()].minutos += v.minutosFoco;
  return b;
}

export function estatisticas(todos: readonly VooComServico[], periodo: Periodo, agora: number): Estatisticas {
  const inicio = inicioDoPeriodo(periodo, agora);
  const inicioAnterior = inicioDoPeriodoAnterior(periodo, agora);
  const doPeriodo = todos.filter((v) => v.encerrouEm >= inicio && v.encerrouEm <= agora);
  const anteriores = todos.filter((v) => v.encerrouEm >= inicioAnterior && v.encerrouEm < inicio);
  const soma = (l: readonly VooDoDiario[]) => l.reduce((s, v) => s + v.minutosFoco, 0);

  const porCategoria = new Map<Categoria, number>();
  for (const v of doPeriodo) if (v.categoria) porCategoria.set(v.categoria, (porCategoria.get(v.categoria) ?? 0) + v.minutosFoco);
  const categorias = CATEGORIAS.filter((c) => (porCategoria.get(c) ?? 0) > 0)
    .map((categoria) => ({ categoria, minutos: porCategoria.get(categoria) ?? 0 }))
    .sort((a, b) => b.minutos - a.minutos);

  return {
    minutos: soma(doPeriodo),
    minutosAnterior: soma(anteriores),
    voos: doPeriodo.length,
    pousos: doPeriodo.filter((v) => v.resultado === 'pousou').length,
    pousosAntes: doPeriodo.filter((v) => v.resultado === 'pousou_antes').length,
    servicos: doPeriodo.reduce((s, v) => s + servicosDoVoo(v), 0),
    ...sequencias(todos, agora),
    barras: barras(doPeriodo, periodo, agora),
    categorias,
  };
}

/** Rótulo curto das barras: "40m", "1h 30", "2h". */
export function minutosCurtos(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${String(m).padStart(2, '0')}` : `${h}h`;
}
