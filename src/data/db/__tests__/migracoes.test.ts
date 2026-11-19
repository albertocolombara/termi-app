import { MIGRACOES, migrar, type BancoMigravel } from '../migracoes';

function bancoFalso(versaoInicial: number) {
  let versao = versaoInicial;
  const executado: string[] = [];
  const db: BancoMigravel = {
    execAsync: async (sql) => {
      executado.push(sql);
      const m = /PRAGMA user_version = (\d+)/.exec(sql);
      if (m) versao = Number(m[1]);
    },
    getFirstAsync: async <T,>() => ({ user_version: versao }) as T,
    withExclusiveTransactionAsync: async (tarefa) => tarefa({ execAsync: db.execAsync }),
  };
  return { db, executado, versao: () => versao };
}

describe('migrações do SQLite', () => {
  it('têm versões em sequência, começando em 1', () => {
    MIGRACOES.forEach((m, i) => expect(m.versao).toBe(i + 1));
  });

  it('nenhuma migração apaga dados conquistados', () => {
    for (const m of MIGRACOES) expect(m.sql).not.toMatch(/\b(DELETE|DROP)\b/i);
  });

  it('aplica só as migrações pendentes', async () => {
    const novo = bancoFalso(0);
    await expect(migrar(novo.db)).resolves.toBe(MIGRACOES.length);
    expect(novo.versao()).toBe(MIGRACOES.length);

    const atualizado = bancoFalso(MIGRACOES.length);
    await migrar(atualizado.db);
    expect(atualizado.executado.some((s) => s.includes('CREATE TABLE'))).toBe(false);
  });
});
