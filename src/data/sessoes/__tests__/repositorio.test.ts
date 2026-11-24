import { voo, AGORA } from '@/domain/voos/__tests__/fabrica';

import { criarSessao, encerrarSessao, salvarMotivoDaSessao, sessaoEmAndamento, type BancoDeSessoes } from '../repositorio';

function bancoFalso(linha: unknown = null, mudancasDoUpdate = 1) {
  const transacoes: { sql: string; params: unknown[] }[][] = [];
  const db: BancoDeSessoes = {
    withExclusiveTransactionAsync: async (tarefa) => {
      const atual: { sql: string; params: unknown[] }[] = [];
      transacoes.push(atual);
      await tarefa({
        runAsync: async (sql, ...params) => {
          atual.push({ sql, params });
          return { changes: sql.startsWith('UPDATE') ? mudancasDoUpdate : 1 };
        },
      });
    },
    getFirstAsync: async <T,>() => linha as T,
    getAllAsync: async <T,>() => [] as T[],
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

  it('encerra com pouso: sessão, crédito e carimbo na mesma transação', async () => {
    const { db, transacoes } = bancoFalso();
    const ok = await encerrarSessao(db, {
      sessaoId: 'abc',
      tipo: 'pouso',
      encerrouEm: AGORA,
      voo: v,
      rendimentos: { minutos: 52, milhas: 640, dolares: 52, carimbo: true, lojaDoDestino: true },
    });
    expect(ok).toBe(true);
    expect(transacoes).toHaveLength(1);
    const [sessao, credito, carimbo] = transacoes[0];
    expect(sessao.sql).toMatch(/WHERE id = \? AND resultado = 'em_voo'/);
    expect(sessao.params).toEqual([AGORA, 'pousou', 52, 640, 'abc']);
    expect(credito.params).toEqual(['abc-credito', 52, 'abc', AGORA]);
    expect(carimbo.params.slice(0, 3)).toEqual(['abc-carimbo', 'abc', 'GIG']);
    for (const { sql } of transacoes[0]) expect(sql).not.toMatch(/DELETE/i);
  });

  it('pousar antes credita sem carimbo', async () => {
    const { db, transacoes } = bancoFalso();
    await encerrarSessao(db, {
      sessaoId: 'abc',
      tipo: 'pousar-antes',
      encerrouEm: AGORA,
      voo: v,
      rendimentos: { minutos: 31, milhas: 410, dolares: 31, carimbo: false, lojaDoDestino: false },
    });
    expect(transacoes[0]).toHaveLength(2);
    expect(transacoes[0][0].params[1]).toBe('pousou_antes');
  });

  it('não credita de novo uma sessão já encerrada', async () => {
    const { db, transacoes } = bancoFalso(null, 0);
    const ok = await encerrarSessao(db, {
      sessaoId: 'abc',
      tipo: 'pouso',
      encerrouEm: AGORA,
      voo: v,
      rendimentos: { minutos: 52, milhas: 640, dolares: 52, carimbo: true, lojaDoDestino: true },
    });
    expect(ok).toBe(false);
    expect(transacoes[0]).toHaveLength(1);
  });
});

describe('motivo da viagem em voo', () => {
  it('atualiza o motivo e as tarefas sem apagar linhas', async () => {
    const operacoes: string[] = [];
    const db: BancoDeSessoes = {
      withExclusiveTransactionAsync: async (tarefa) => {
        await tarefa({
          runAsync: async (sql) => {
            operacoes.push(sql.trim().split(/\s+/)[0]);
            return { changes: 1 };
          },
        });
      },
      getFirstAsync: async <T,>() => null as T,
      // Já havia 3 tarefas (ordens 0, 1 e 2).
      getAllAsync: async <T,>() => [{ ordem: 0 }, { ordem: 1 }, { ordem: 2 }] as T[],
    };
    await salvarMotivoDaSessao(db, 's1', {
      categoria: 'estudo',
      foco: 'Cálculo',
      tarefas: [
        { texto: 'Lista 2', feita: true },
        { texto: 'Teoremas', feita: false },
      ],
    });
    expect(operacoes).toEqual(['INSERT', 'UPDATE', 'UPDATE', 'UPDATE']);
    expect(operacoes).not.toContain('DELETE');
  });
});
