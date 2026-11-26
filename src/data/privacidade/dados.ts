/**
 * Exportar e apagar os dados do usuário (UC-16, RF-45, LGPD).
 *
 * - Exportar: um JSON legível com todas as tabelas do progresso (voos, motivos e tarefas, serviços
 *   de bordo, carimbos, souvenirs e lançamentos do saldo).
 * - Apagar: o único fluxo em que o app apaga progresso (CLAUDE.md §6.6), só depois da confirmação
 *   explícita do usuário. Numa transação só: ou apaga tudo, ou nada. Os ajustes e a vista da janela
 *   ficam (são preferências do aparelho, não progresso); o aviso diz isso antes.
 * Ainda não há conta nem servidor: só dados do aparelho.
 */
type Valor = string | number | null;
type Leitura = { getAllAsync<T>(sql: string, ...params: Valor[]): Promise<T[]> };
export type BancoDosDados = Leitura & {
  withExclusiveTransactionAsync(tarefa: (txn: { execAsync(sql: string): Promise<void> }) => Promise<void>): Promise<void>;
};

/** Tabelas do progresso, na ordem em que são apagadas (filhas antes das mães). */
export const TABELAS_DO_PROGRESSO = [
  'tarefas',
  'motivos_da_viagem',
  'servicos_de_bordo',
  'carimbos',
  'souvenirs_na_mala',
  'lancamentos',
  'sessoes',
] as const;

export type Exportacao = {
  app: 'Termi: Focus Flights';
  formato: 1;
  exportadoEm: string;
  versaoDoApp: string | null;
  tabelas: Record<(typeof TABELAS_DO_PROGRESSO)[number], Record<string, unknown>[]>;
};

export async function exportarDados(db: Leitura, agora: number, versaoDoApp: string | null): Promise<Exportacao> {
  const tabelas = {} as Exportacao['tabelas'];
  for (const nome of TABELAS_DO_PROGRESSO) {
    const linhas = await db.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${nome}`);
    // O voo fica gravado como texto JSON: na exportação vira objeto, mais fácil de ler.
    tabelas[nome] = linhas.map((l) => {
      if (typeof l.voo_json !== 'string') return l;
      try {
        const { voo_json, ...resto } = l;
        return { ...resto, voo: JSON.parse(voo_json as string) };
      } catch {
        return l;
      }
    });
  }
  return { app: 'Termi: Focus Flights', formato: 1, exportadoEm: new Date(agora).toISOString(), versaoDoApp, tabelas };
}

export async function apagarDados(db: BancoDosDados): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const nome of TABELAS_DO_PROGRESSO) await txn.execAsync(`DELETE FROM ${nome}`);
  });
}

/** Nome do arquivo: termi-dados-2026-11-26.json (data local). */
export function nomeDoArquivo(agora: number): string {
  const d = new Date(agora);
  const p = (n: number) => String(n).padStart(2, '0');
  return `termi-dados-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`;
}
