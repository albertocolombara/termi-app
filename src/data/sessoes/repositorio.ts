/**
 * Sessões de voo no SQLite (ARCHITECTURE §5). Só acrescenta: nada de DELETE (CLAUDE.md §6.6).
 * A sessão, o motivo da viagem e as tarefas são gravados numa única transação (CLAUDE.md §6.5).
 */
import { normalizarMotivo, type Categoria, type MotivoDaViagem } from '@/domain/sessao/motivo';
import type { Rendimentos } from '@/domain/sessao/rendimentos';
import type { IntervaloServicoDeBordo } from '@/domain/sessao/pausas';
import type { Voo } from '@/domain/voos/tipos';

type Valor = string | number | null;

/** O pedaço da API do expo-sqlite que usamos (permite testar sem o módulo nativo). */
export type BancoDeSessoes = {
  withExclusiveTransactionAsync(
    tarefa: (txn: { runAsync(sql: string, ...params: Valor[]): Promise<{ changes: number }> }) => Promise<void>,
  ): Promise<void>;
  getFirstAsync<T>(sql: string, ...params: Valor[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...params: Valor[]): Promise<T[]>;
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
  return l ? daLinha(l) : null;
}

function daLinha(l: LinhaDaSessao): SessaoGravada {
  return {
    id: l.id,
    voo: JSON.parse(l.voo_json) as Voo,
    tempoEscolhidoMin: l.tempo_escolhido_min,
    embarcouEm: l.embarcou_em,
    pousoPrevistoEm: l.pouso_previsto_em,
    intervaloServico: l.intervalo_servico === 'desligado' ? 'desligado' : (Number(l.intervalo_servico) as 25 | 50),
  };
}

export type Encerramento = {
  sessaoId: string;
  tipo: 'pouso' | 'pousar-antes';
  encerrouEm: number;
  rendimentos: Rendimentos;
  voo: Voo;
};

/**
 * Encerra a sessão e credita o que ela rendeu, numa única transação (CLAUDE.md §6.5):
 * resultado na sessão, lançamento de saldo e, no pouso, o carimbo.
 * Só encerra uma sessão que ainda está em voo: chamar duas vezes não credita duas vezes.
 * Devolve `false` se a sessão já estava encerrada.
 */
export async function encerrarSessao(db: BancoDeSessoes, e: Encerramento): Promise<boolean> {
  let encerrou = false;
  await db.withExclusiveTransactionAsync(async (txn) => {
    const r = await txn.runAsync(
      "UPDATE sessoes SET encerrou_em = ?, resultado = ?, minutos_foco = ?, milhas = ? WHERE id = ? AND resultado = 'em_voo'",
      e.encerrouEm,
      e.tipo === 'pouso' ? 'pousou' : 'pousou_antes',
      e.rendimentos.minutos,
      e.rendimentos.milhas,
      e.sessaoId,
    );
    if (r.changes !== 1) return;
    encerrou = true;
    if (e.rendimentos.dolares > 0) {
      await txn.runAsync(
        "INSERT INTO lancamentos (id, tipo, valor, sessao_id, criado_em) VALUES (?, 'credito_voo', ?, ?, ?)",
        `${e.sessaoId}-credito`,
        e.rendimentos.dolares,
        e.sessaoId,
        e.encerrouEm,
      );
    }
    if (e.rendimentos.carimbo) {
      await txn.runAsync(
        'INSERT INTO carimbos (id, sessao_id, aeroporto, cidade, pais, data) VALUES (?, ?, ?, ?, ?, ?)',
        `${e.sessaoId}-carimbo`,
        e.sessaoId,
        e.voo.destino.iata ?? e.voo.destino.icao,
        e.voo.destino.cidade,
        e.voo.destino.pais,
        e.encerrouEm,
      );
    }
  });
  return encerrou;
}

export type SessaoEncerrada = SessaoGravada & {
  resultado: 'pousou' | 'pousou_antes';
  encerrouEm: number;
  minutosFoco: number;
  milhas: number;
  dolares: number;
  motivo: MotivoDaViagem;
};

/** Sessão encerrada com o que rendeu e o motivo da viagem (tela de pouso e, depois, o diário). */
export async function sessaoEncerrada(db: BancoDeSessoes, id: string): Promise<SessaoEncerrada | null> {
  const l = await db.getFirstAsync<
    LinhaDaSessao & { resultado: string; encerrou_em: number; minutos_foco: number; milhas: number; categoria: string | null; foco: string | null; dolares: number | null }
  >(
    `SELECT s.id, s.voo_json, s.tempo_escolhido_min, s.embarcou_em, s.pouso_previsto_em, s.intervalo_servico,
            s.resultado, s.encerrou_em, s.minutos_foco, s.milhas, m.categoria, m.foco,
            (SELECT SUM(valor) FROM lancamentos WHERE sessao_id = s.id AND tipo = 'credito_voo') AS dolares
       FROM sessoes s LEFT JOIN motivos_da_viagem m ON m.sessao_id = s.id
      WHERE s.id = ? AND s.resultado IN ('pousou', 'pousou_antes')`,
    id,
  );
  if (!l) return null;
  const tarefas = await db.getAllAsync<{ texto: string; feita: number }>('SELECT texto, feita FROM tarefas WHERE sessao_id = ? ORDER BY ordem', id);
  return {
    ...daLinha(l),
    resultado: l.resultado as 'pousou' | 'pousou_antes',
    encerrouEm: l.encerrou_em,
    minutosFoco: l.minutos_foco,
    milhas: l.milhas,
    dolares: l.dolares ?? 0,
    motivo: { categoria: (l.categoria as Categoria | null) ?? null, foco: l.foco ?? '', tarefas: tarefas.map((t) => ({ texto: t.texto, feita: t.feita === 1 })) },
  };
}
