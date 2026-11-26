import { apagarDados, exportarDados, nomeDoArquivo, TABELAS_DO_PROGRESSO } from '../dados';

describe('exportarDados', () => {
  it('lê todas as tabelas e abre o voo gravado como texto', async () => {
    const consultas: string[] = [];
    const db = {
      getAllAsync: async <T,>(sql: string) => {
        consultas.push(sql);
        return (sql.includes('sessoes') ? [{ id: 's1', voo_json: '{"callsign":"TAP108"}' }] : []) as T[];
      },
    };
    const e = await exportarDados(db, Date.UTC(2026, 10, 26, 12), '0.1.0');
    expect(consultas).toHaveLength(TABELAS_DO_PROGRESSO.length);
    expect(e.tabelas.sessoes).toEqual([{ id: 's1', voo: { callsign: 'TAP108' } }]);
    expect(e.exportadoEm).toBe('2026-11-26T12:00:00.000Z');
  });
});

describe('apagarDados', () => {
  it('apaga todas as tabelas numa transação só', async () => {
    const comandos: string[] = [];
    let transacoes = 0;
    await apagarDados({
      getAllAsync: async () => [],
      withExclusiveTransactionAsync: async (tarefa) => {
        transacoes++;
        await tarefa({ execAsync: async (sql) => void comandos.push(sql) });
      },
    });
    expect(transacoes).toBe(1);
    expect(comandos).toEqual(TABELAS_DO_PROGRESSO.map((t) => `DELETE FROM ${t}`));
  });
});

describe('nomeDoArquivo', () => {
  it('usa a data local', () => {
    expect(nomeDoArquivo(new Date(2026, 10, 6, 9).getTime())).toBe('termi-dados-2026-11-06.json');
  });
});
