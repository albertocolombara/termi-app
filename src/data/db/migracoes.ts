/**
 * Esquema local (SQLite). Modelo de dados: ARCHITECTURE.md §5.
 *
 * Regras:
 * - Registros conquistados (sessões, carimbos, souvenirs, lançamentos) só são acrescentados.
 *   Nada de DELETE fora do fluxo "Apagar dados" pedido pelo usuário (UC-16).
 * - O saldo é a soma de `lancamentos`, nunca um número solto.
 * - Migrações só avançam: nunca edite uma migração já publicada; crie a próxima.
 */

export type Migracao = { versao: number; descricao: string; sql: string };

export const MIGRACOES: Migracao[] = [
  {
    versao: 1,
    descricao: 'Esquema inicial: sessões, motivo da viagem, serviço de bordo, carimbos, mala e saldo',
    sql: `
      CREATE TABLE sessoes (
        id TEXT PRIMARY KEY NOT NULL,
        voo_json TEXT NOT NULL,                 -- cópia do voo no embarque (o cache pode mudar)
        tempo_escolhido_min INTEGER NOT NULL,
        embarcou_em INTEGER NOT NULL,           -- ms
        pouso_previsto_em INTEGER NOT NULL,     -- ms, fixado no embarque
        encerrou_em INTEGER,                    -- ms
        resultado TEXT NOT NULL DEFAULT 'em_voo'
          CHECK (resultado IN ('em_voo', 'pousou', 'pousou_antes', 'cancelado')),
        minutos_foco INTEGER,
        milhas INTEGER,
        lugar_sobrevoado TEXT,
        voo_de_ontem INTEGER NOT NULL DEFAULT 0,
        intervalo_servico TEXT NOT NULL         -- '25' | '50' | 'desligado'
      );
      CREATE INDEX sessoes_embarcou_em ON sessoes (embarcou_em);

      CREATE TABLE motivos_da_viagem (
        sessao_id TEXT PRIMARY KEY NOT NULL REFERENCES sessoes (id),
        categoria TEXT,
        foco TEXT
      );

      CREATE TABLE tarefas (
        id TEXT PRIMARY KEY NOT NULL,
        sessao_id TEXT NOT NULL REFERENCES sessoes (id),
        texto TEXT NOT NULL,
        feita INTEGER NOT NULL DEFAULT 0,
        ordem INTEGER NOT NULL
      );

      CREATE TABLE servicos_de_bordo (
        id TEXT PRIMARY KEY NOT NULL,
        sessao_id TEXT NOT NULL REFERENCES sessoes (id),
        inicio_previsto INTEGER NOT NULL,
        iniciou_em INTEGER,
        terminou_em INTEGER,
        voltou_antes INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE carimbos (
        id TEXT PRIMARY KEY NOT NULL,
        sessao_id TEXT REFERENCES sessoes (id), -- nulo nos carimbos de nível
        nivel TEXT,
        aeroporto TEXT,
        cidade TEXT,
        pais TEXT,
        data INTEGER NOT NULL,
        estilo TEXT
      );

      CREATE TABLE souvenirs_na_mala (
        souvenir_id TEXT PRIMARY KEY NOT NULL,  -- id do catálogo (a coleção não tem tamanho fixo)
        comprado_em INTEGER NOT NULL,
        sessao_id TEXT REFERENCES sessoes (id),
        preco INTEGER NOT NULL,
        amostra INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE lancamentos (
        id TEXT PRIMARY KEY NOT NULL,
        tipo TEXT NOT NULL CHECK (tipo IN ('credito_voo', 'compra_souvenir')),
        valor INTEGER NOT NULL,                 -- em $ do jogo; crédito > 0, compra < 0
        sessao_id TEXT REFERENCES sessoes (id),
        souvenir_id TEXT,
        criado_em INTEGER NOT NULL
      );
    `,
  },
];

/** Interface mínima do banco, para testar as migrações sem o módulo nativo. */
export type BancoMigravel = {
  execAsync(sql: string): Promise<void>;
  getFirstAsync<T>(sql: string): Promise<T | null>;
  withExclusiveTransactionAsync(tarefa: (txn: { execAsync(sql: string): Promise<void> }) => Promise<void>): Promise<void>;
};

/** Aplica, em ordem e numa transação cada, as migrações que faltam (controle por PRAGMA user_version). */
export async function migrar(db: BancoMigravel, migracoes: Migracao[] = MIGRACOES): Promise<number> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const atual = (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))?.user_version ?? 0;
  const pendentes = migracoes.filter((m) => m.versao > atual).sort((a, b) => a.versao - b.versao);
  for (const m of pendentes) {
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.execAsync(m.sql);
      await txn.execAsync(`PRAGMA user_version = ${m.versao}`);
    });
  }
  return pendentes.at(-1)?.versao ?? atual;
}
