/**
 * Sessões de voo no SQLite (ARCHITECTURE §5). Só acrescenta: nada de DELETE (CLAUDE.md §6.6).
 * A sessão, o motivo da viagem e as tarefas são gravados numa única transação (CLAUDE.md §6.5).
 */
import { normalizarMotivo, type MotivoDaViagem } from '@/domain/sessao/motivo';
import type { IntervaloServicoDeBordo } from '@/domain/sessao/pausas';
import type { Voo } from '@/domain/voos/tipos';

type Valor = string | number | null;

/** O pedaço da API do expo-sqlite que usamos (permite testar sem o módulo nativo). */
export type BancoDeSessoes = {
  withExclusiveTransactionAsync(tarefa: (txn: { runAsync(sql: string, ...params: Valor[]): Promise<unknown> }) => Promise<void>): Promise<void>;
  getFirstAsync<T>(sql: string, ...params: Valor[]): Promise<T | null>;
};

export type NovaSessao = {
  voo: Voo;
  embarcouEm: number;
  /** Fim do tempo do usuário (RN-09): o pouso previsto do voo no embarque. */
  pousoPrevistoEm: number;
  intervaloServico: IntervaloServicoDeBordo;
  motivo: MotivoDaViagem;
  vooDeOntem: boolean;
};

export type SessaoGravada = {
  id: string;
  voo: Voo;
  tempoEscolhidoMin: number;
  embarcouEm: number;
  pousoPrevistoEm: number;
  intervaloServico: IntervaloServicoDeBordo;
};

/** Id local, único no aparelho (a sincronização, quando existir, usa o próprio id). */
export const novoId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export async function criarSessao(db: BancoDeSessoes, s: NovaSessao, id = novoId()): Promise<string> {
  const tempoMin = Math.round((s.pousoPrevistoEm - s.embarcouEm) / 60_000);
  const motivo = normalizarMotivo(s.motivo);
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      `INSERT INTO sessoes (id, voo_json, tempo_escolhido_min, embarcou_em, pouso_previsto_em, voo_de_ontem, intervalo_servico)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      id,
      JSON.stringify(s.voo),
      tempoMin,
      s.embarcouEm,
      s.pousoPrevistoEm,
      s.vooDeOntem ? 1 : 0,
      String(s.intervaloServico),
    );
    if (motivo.categoria || motivo.foco) {
      await txn.runAsync('INSERT INTO motivos_da_viagem (sessao_id, categoria, foco) VALUES (?, ?, ?)', id, motivo.categoria, motivo.foco || null);
    }
    for (const [ordem, tarefa] of motivo.tarefas.entries()) {
      await txn.runAsync(
        'INSERT INTO tarefas (id, sessao_id, texto, feita, ordem) VALUES (?, ?, ?, ?, ?)',
        `${id}-t${ordem}`,
        id,
        tarefa.texto,
        tarefa.feita ? 1 : 0,
        ordem,
      );
    }
  });
  return id;
}

type LinhaDaSessao = {
  id: string;
  voo_json: string;
  tempo_escolhido_min: number;
  embarcou_em: number;
  pouso_previsto_em: number;
  intervalo_servico: string;
};

/** A sessão que ainda não encerrou, se houver (o app pode ter sido fechado no meio do voo). */
export async function sessaoEmAndamento(db: BancoDeSessoes): Promise<SessaoGravada | null> {
  const l = await db.getFirstAsync<LinhaDaSessao>(
    "SELECT id, voo_json, tempo_escolhido_min, embarcou_em, pouso_previsto_em, intervalo_servico FROM sessoes WHERE resultado = 'em_voo' ORDER BY embarcou_em DESC LIMIT 1",
  );
  if (!l) return null;
  return {
    id: l.id,
    voo: JSON.parse(l.voo_json) as Voo,
    tempoEscolhidoMin: l.tempo_escolhido_min,
    embarcouEm: l.embarcou_em,
    pousoPrevistoEm: l.pouso_previsto_em,
    intervaloServico: l.intervalo_servico === 'desligado' ? 'desligado' : (Number(l.intervalo_servico) as 25 | 50),
  };
}
