import { voo, AGORA } from '@/domain/voos/__tests__/fabrica';

import { criarSessao, sessaoEmAndamento, type BancoDeSessoes } from '../repositorio';

function bancoFalso(linha: unknown = null) {
  const transacoes: { sql: string; params: unknown[] }[][] = [];
  const db: BancoDeSessoes = {
    withExclusiveTransactionAsync: async (tarefa) => {
      const atual: { sql: string; params: unknown[] }[] = [];
      transacoes.push(atual);
      await tarefa({ runAsync: async (sql, ...params) => atual.push({ sql, params }) });
    },
    getFirstAsync: async <T,>() => linha as T,
  };
  return { db, transacoes };
}

describe('repositório de sessões', () => {
  const v = voo(55);

  it('grava sessão, motivo e tarefas numa única transação', async () => {
    const { db, transacoes } = bancoFalso();
    const id = await criarSessao(
      db,
      {
        voo: v,
        embarcouEm: AGORA,
        pousoPrevistoEm: AGORA + 55 * 60_000,
        intervaloServico: 25,
        vooDeOntem: false,
        motivo: { categoria: 'estudo', foco: ' Cálculo ', tarefas: [{ texto: 'Lista 2', feita: false }, { texto: ' ', feita: false }] },
      },
      'abc',
    );
    expect(id).toBe('abc');
    expect(transacoes).toHaveLength(1);
    const [sessao, motivo, tarefa, ...resto] = transacoes[0];
    expect(sessao.sql).toMatch(/INSERT INTO sessoes/);
    expect(sessao.params.slice(2, 7)).toEqual([55, AGORA, AGORA + 55 * 60_000, 0, '25']);
    expect(motivo.params).toEqual(['abc', 'estudo', 'Cálculo']);
    expect(tarefa.params).toEqual(['abc-t0', 'abc', 'Lista 2', 0, 0]);
    expect(resto).toHaveLength(0);
    for (const { sql } of transacoes[0]) expect(sql).not.toMatch(/DELETE|UPDATE/i);
  });

  it('sem motivo, grava só a sessão', async () => {
    const { db, transacoes } = bancoFalso();
    await criarSessao(db, {
      voo: v,
      embarcouEm: AGORA,
      pousoPrevistoEm: AGORA + 55 * 60_000,
      intervaloServico: 'desligado',
      vooDeOntem: true,
      motivo: { categoria: null, foco: '', tarefas: [] },
    });
    expect(transacoes[0]).toHaveLength(1);
    expect(transacoes[0][0].params.slice(5, 7)).toEqual([1, 'desligado']);
  });

  it('lê a sessão em andamento', async () => {
    const { db } = bancoFalso({
      id: 'abc',
      voo_json: JSON.stringify(v),
      tempo_escolhido_min: 55,
      embarcou_em: AGORA,
      pouso_previsto_em: AGORA + 1,
      intervalo_servico: '50',
    });
    const s = await sessaoEmAndamento(db);
    expect(s?.voo.hex).toBe(v.hex);
    expect(s?.intervaloServico).toBe(50);
    expect(await sessaoEmAndamento(bancoFalso(null).db)).toBeNull();
  });
});
