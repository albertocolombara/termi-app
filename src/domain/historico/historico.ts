/**
 * Histórico de voos (diário de bordo, Início e estatísticas). Funções puras sobre os voos encerrados.
 * PRD: RF-34 (diário), RF-35 (estatísticas); Início v3 (globo com as rotas voadas, último voo).
 */
import type { Categoria } from '@/domain/sessao/motivo';
import type { Aeroporto } from '@/domain/voos/tipos';

/** Um voo encerrado, como o diário de bordo mostra. */
export type VooDoDiario = {
  id: string;
  callsign: string;
  companhiaPais: string | null;
  origem: Aeroporto;
  destino: Aeroporto;
  embarcouEm: number;
  encerrouEm: number;
  /** Tempo escolhido no embarque (min). */
  tempoEscolhidoMin: number;
  minutosFoco: number;
  milhas: number;
  resultado: 'pousou' | 'pousou_antes';
  categoria: Categoria | null;
  foco: string;
};

/** Uma rota no globo: vários voos no mesmo trecho viram uma linha só. */
export type RotaVoada = {
  chave: string;
  origem: Aeroporto;
  destino: Aeroporto;
  /** O voo mais recente nesse trecho (é o que o bloco da rota mostra). */
  ultimoVoo: VooDoDiario;
  voos: number;
};

const codigo = (a: Aeroporto) => a.iata ?? a.icao ?? `${a.lat.toFixed(2)},${a.lon.toFixed(2)}`;

/**
 * Rotas do globo: agrupa os voos por trecho (origem → destino), do mais recente para o mais antigo.
 * Só entram pousos completos: quem pousou antes não chegou ao destino, então a rota não fecha
 * (Alberto, build-47). O voo continua contando no diário, nas milhas e nos totais.
 */
export function rotasVoadas(voos: readonly VooDoDiario[]): RotaVoada[] {
  const porChave = new Map<string, RotaVoada>();
  const ordenados = voos.filter((v) => v.resultado === 'pousou').sort((a, b) => b.encerrouEm - a.encerrouEm);
  for (const v of ordenados) {
    const chave = `${codigo(v.origem)}>${codigo(v.destino)}`;
    const existente = porChave.get(chave);
    if (existente) existente.voos++;
    else porChave.set(chave, { chave, origem: v.origem, destino: v.destino, ultimoVoo: v, voos: 1 });
  }
  return [...porChave.values()];
}

export type ResumoDoDiario = {
  /** Todos os voos (pousou e pousou antes). */
  voos: number;
  /** Só os que pousaram: o "voos concluídos" do Início (pedido do Alberto, build-48). */
  concluidos: number;
  minutos: number;
  milhas: number;
};

/** Totais do Início e do diário. Minutos e milhas contam todo voo encerrado (nunca punir); "concluídos" só os que pousaram. */
export function resumoDoDiario(voos: readonly VooDoDiario[]): ResumoDoDiario {
  // Minutos e milhas de quem pousou antes continuam somando: o tempo focado nunca se perde.
  return voos.reduce<ResumoDoDiario>(
    (r, v) => ({
      voos: r.voos + 1,
      concluidos: r.concluidos + (v.resultado === 'pousou' ? 1 : 0),
      minutos: r.minutos + v.minutosFoco,
      milhas: r.milhas + v.milhas,
    }),
    { voos: 0, concluidos: 0, minutos: 0, milhas: 0 },
  );
}

export type Periodo = 'dia' | 'semana' | 'mes' | 'ano';

/**
 * Começo do período no horário do aparelho: hoje, a semana (segunda-feira), o mês ou o ano corrente.
 */
export function inicioDoPeriodo(periodo: Periodo, agora: number): number {
  const d = new Date(agora);
  d.setHours(0, 0, 0, 0);
  if (periodo === 'semana') {
    const diasDesdeSegunda = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - diasDesdeSegunda);
  } else if (periodo === 'mes') {
    d.setDate(1);
  } else if (periodo === 'ano') {
    d.setMonth(0, 1);
  }
  return d.getTime();
}

/** Voos encerrados dentro do período corrente. */
export function voosDoPeriodo(voos: readonly VooDoDiario[], periodo: Periodo, agora: number): VooDoDiario[] {
  const inicio = inicioDoPeriodo(periodo, agora);
  return voos.filter((v) => v.encerrouEm >= inicio && v.encerrouEm <= agora);
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "hoje", "ontem" ou a data curta ("20 nov"), no horário do aparelho. */
export function dataRelativa(ms: number, agora: number): string {
  const dia = (x: number) => {
    const d = new Date(x);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const diferenca = Math.round((dia(agora) - dia(ms)) / 86_400_000);
  if (diferenca === 0) return 'hoje';
  if (diferenca === 1) return 'ontem';
  const d = new Date(ms);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

const DIAS_DA_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** Cabeçalho de um dia no diário: "Hoje", "Ontem" ou "Seg, 16 nov". */
export function rotuloDoDia(ms: number, agora: number): string {
  const r = dataRelativa(ms, agora);
  if (r === 'hoje') return 'Hoje';
  if (r === 'ontem') return 'Ontem';
  return `${DIAS_DA_SEMANA[new Date(ms).getDay()]}, ${r}`;
}

/** Agrupa os voos por dia (já ordenados do mais recente para o mais antigo). */
export function voosPorDia<T extends { encerrouEm: number }>(voos: readonly T[], agora: number): { dia: string; voos: T[] }[] {
  const grupos: { dia: string; voos: T[] }[] = [];
  for (const v of voos) {
    const dia = rotuloDoDia(v.encerrouEm, agora);
    const ultimo = grupos.at(-1);
    if (ultimo && ultimo.dia === dia) ultimo.voos.push(v);
    else grupos.push({ dia, voos: [v] });
  }
  return grupos;
}
