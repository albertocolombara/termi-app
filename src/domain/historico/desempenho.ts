/**
 * Blocos de desempenho das Estatísticas (M4 · Plus · v4, Figma 546:8545, proposta do Alberto em
 * 26/11/2026): média e melhor dia, resumo do período, semana da sequência, horário de foco,
 * categorias com porcentagem, bagagem de mão (tarefas), pelo mundo e milhas.
 * Funções puras sobre os voos encerrados; horário do aparelho.
 */
import { statusDeViajante, type StatusDeViajante } from '@/domain/status/niveis';
import type { Categoria } from '@/domain/sessao/motivo';

import type { VooComServico } from './estatisticas';
import { inicioDoPeriodo, rotasVoadas, type Periodo } from './historico';

const DIA_MS = 86_400_000;
const KM_POR_MILHA = 1.609344;
/** Circunferência da Terra no equador (km), para "x% de uma volta ao redor da Terra". */
export const VOLTA_DA_TERRA_KM = 40_075;

const doPeriodo = (voos: readonly VooComServico[], periodo: Periodo, agora: number) => {
  const inicio = inicioDoPeriodo(periodo, agora);
  return voos.filter((v) => v.encerrouEm >= inicio && v.encerrouEm <= agora);
};

/** Dias do período já começados (inclui hoje): a média não fica baixa no começo da semana ou do mês. */
export function diasCorridos(periodo: Periodo, agora: number): number {
  return Math.max(1, Math.floor((agora - inicioDoPeriodo(periodo, agora)) / DIA_MS) + 1);
}

export type MediaEMelhor = {
  /** Minutos por dia (dia, semana e mês) ou por mês (ano). */
  media: number;
  unidade: 'dia' | 'mes';
  /** Dia (ou mês, no ano) com mais minutos; null sem voos. `quando` é o meio-dia do dia ou o dia 1 do mês. */
  melhor: { quando: number; minutos: number } | null;
};

export function mediaEMelhor(voos: readonly VooComServico[], periodo: Periodo, agora: number): MediaEMelhor {
  const lista = doPeriodo(voos, periodo, agora);
  const total = lista.reduce((s, v) => s + v.minutosFoco, 0);
  const porMes = periodo === 'ano';
  const chave = (ms: number) => {
    const d = new Date(ms);
    return porMes ? new Date(d.getFullYear(), d.getMonth(), 1).getTime() : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).getTime();
  };
  const soma = new Map<number, number>();
  for (const v of lista) soma.set(chave(v.encerrouEm), (soma.get(chave(v.encerrouEm)) ?? 0) + v.minutosFoco);
  let melhor: MediaEMelhor['melhor'] = null;
  for (const [quando, minutos] of soma) if (!melhor || minutos > melhor.minutos) melhor = { quando, minutos };
  const divisor = porMes ? new Date(agora).getMonth() + 1 : diasCorridos(periodo, agora);
  return { media: Math.round(total / divisor), unidade: porMes ? 'mes' : 'dia', melhor };
}

export type Resumo = {
  voos: number;
  pousos: number;
  pousosAntes: number;
  /** Minutos médios por voo; 0 sem voos. */
  sessaoMedia: number;
  vooMaisLongo: number;
  /** Fração dos voos que chegaram ao destino (0 a 1); 0 sem voos. */
  chegaram: number;
};

export function resumo(voos: readonly VooComServico[], periodo: Periodo, agora: number): Resumo {
  const lista = doPeriodo(voos, periodo, agora);
  const pousos = lista.filter((v) => v.resultado === 'pousou').length;
  const total = lista.reduce((s, v) => s + v.minutosFoco, 0);
  return {
    voos: lista.length,
    pousos,
    pousosAntes: lista.length - pousos,
    sessaoMedia: lista.length ? Math.round(total / lista.length) : 0,
    vooMaisLongo: lista.reduce((m, v) => Math.max(m, v.minutosFoco), 0),
    chegaram: lista.length ? pousos / lista.length : 0,
  };
}

export type DiaDaSemana = { rotulo: string; estado: 'voou' | 'hoje' | 'hoje-voou' | 'vazio' | 'futuro' };

/** A semana corrente (segunda a domingo) no cartão da sequência: em que dias houve foco. */
export function semanaDaSequencia(voos: readonly VooComServico[], agora: number): DiaDaSemana[] {
  const inicio = inicioDoPeriodo('semana', agora);
  const hoje = (new Date(agora).getDay() + 6) % 7;
  const comVoo = new Set(
    voos.filter((v) => v.encerrouEm >= inicio && v.encerrouEm <= agora).map((v) => (new Date(v.encerrouEm).getDay() + 6) % 7),
  );
  return ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((rotulo, i) => ({
    rotulo,
    estado: i === hoje ? (comVoo.has(i) ? 'hoje-voou' : 'hoje') : i > hoje ? 'futuro' : comVoo.has(i) ? 'voou' : 'vazio',
  }));
}

export type HorarioDeFoco = {
  /** 12 faixas de 2 h (0–2 h … 22–24 h) com os minutos de voo em cada uma. */
  faixas: number[];
  /** Janela de 4 h (duas faixas seguidas) com mais minutos; null sem voos. */
  maisForte: { de: number; ate: number } | null;
};

/** Minutos de foco por faixa de 2 h, pelo tempo real de cada voo (um voo pode cruzar faixas). */
export function horarioDeFoco(voos: readonly VooComServico[], periodo: Periodo, agora: number): HorarioDeFoco {
  const faixas = Array.from({ length: 12 }, () => 0);
  for (const v of doPeriodo(voos, periodo, agora)) {
    // Distribui os minutos de foco ao longo do voo, minuto a minuto (voos têm no máximo 6 h).
    const voado = Math.max(1, Math.round((v.encerrouEm - v.embarcouEm) / 60_000));
    const porMinuto = v.minutosFoco / voado;
    for (let m = 0; m < voado; m++) faixas[Math.floor(new Date(v.embarcouEm + m * 60_000).getHours() / 2)] += porMinuto;
  }
  const arredondadas = faixas.map((f) => Math.round(f));
  let melhor = -1;
  let maisForte: HorarioDeFoco['maisForte'] = null;
  for (let i = 0; i < 11; i++) {
    const soma = arredondadas[i] + arredondadas[i + 1];
    if (soma > melhor && soma > 0) {
      melhor = soma;
      maisForte = { de: i * 2, ate: i * 2 + 4 };
    }
  }
  return { faixas: arredondadas, maisForte };
}

/** Categorias com a porcentagem do tempo com categoria (arredondada para fechar 100). */
export function porcentagens(categorias: readonly { categoria: Categoria; minutos: number }[]): { categoria: Categoria; minutos: number; porcento: number }[] {
  const total = categorias.reduce((s, c) => s + c.minutos, 0);
  if (!total) return [];
  const brutos = categorias.map((c) => ({ ...c, exato: (c.minutos / total) * 100 }));
  const base = brutos.map((b) => ({ ...b, porcento: Math.floor(b.exato) }));
  let falta = 100 - base.reduce((s, b) => s + b.porcento, 0);
  // Maiores restos ganham o ponto que falta (soma sempre 100).
  for (const b of [...base].sort((a, z) => z.exato - z.porcento - (a.exato - a.porcento))) {
    if (falta <= 0) break;
    b.porcento++;
    falta--;
  }
  return base.map(({ categoria, minutos, porcento }) => ({ categoria, minutos, porcento }));
}

export type Bagagem = { tarefas: number; feitas: number; voosComTarefas: number; voos: number };

export function bagagemDeMao(voos: readonly VooComServico[], periodo: Periodo, agora: number): Bagagem {
  const lista = doPeriodo(voos, periodo, agora);
  return {
    tarefas: lista.reduce((s, v) => s + (v.tarefas ?? 0), 0),
    feitas: lista.reduce((s, v) => s + (v.tarefasFeitas ?? 0), 0),
    voosComTarefas: lista.filter((v) => (v.tarefas ?? 0) > 0).length,
    voos: lista.length,
  };
}

export type PeloMundo = {
  km: number;
  /** Países em que pousou pela primeira vez no período. */
  paisesNovos: number;
  /** Cidades diferentes em que pousou no período. */
  cidades: number;
  rotaMaisVoada: { origem: string; destino: string; voos: number } | null;
  /** km ÷ volta da Terra (0 a ∞). */
  voltaDaTerra: number;
};

const nomeDoLugar = (a: { cidade: string | null; iata: string | null; icao: string | null }) => a.cidade ?? a.iata ?? a.icao ?? '—';

export function peloMundo(voos: readonly VooComServico[], periodo: Periodo, agora: number): PeloMundo {
  const inicio = inicioDoPeriodo(periodo, agora);
  const lista = doPeriodo(voos, periodo, agora);
  const km = Math.round(lista.reduce((s, v) => s + v.milhas, 0) * KM_POR_MILHA);
  const pousosAntes = new Set(voos.filter((v) => v.resultado === 'pousou' && v.encerrouEm < inicio).map((v) => v.destino.pais).filter(Boolean));
  const pousos = lista.filter((v) => v.resultado === 'pousou');
  const paisesNovos = new Set(pousos.map((v) => v.destino.pais).filter((p): p is string => !!p && !pousosAntes.has(p))).size;
  const cidades = new Set(pousos.map((v) => nomeDoLugar(v.destino))).size;
  const rotas = rotasVoadas(lista).sort((a, b) => b.voos - a.voos);
  const top = rotas[0];
  return {
    km,
    paisesNovos,
    cidades,
    rotaMaisVoada: top ? { origem: nomeDoLugar(top.origem), destino: nomeDoLugar(top.destino), voos: top.voos } : null,
    voltaDaTerra: km / VOLTA_DA_TERRA_KM,
  };
}

export type MilhasDoPeriodo = { doPeriodo: number; total: number; status: StatusDeViajante };

export function milhasDoPeriodo(voos: readonly VooComServico[], periodo: Periodo, agora: number): MilhasDoPeriodo {
  const total = voos.reduce((s, v) => s + v.milhas, 0);
  return { doPeriodo: doPeriodo(voos, periodo, agora).reduce((s, v) => s + v.milhas, 0), total, status: statusDeViajante(total) };
}
