/**
 * Leituras do histórico no SQLite: voos encerrados, saldo e contagens do menu lateral.
 * Só leitura; as escritas ficam em `data/sessoes/repositorio.ts`.
 */
import type { VooComServico } from '@/domain/historico/estatisticas';
import type { Categoria } from '@/domain/sessao/motivo';
import type { Voo } from '@/domain/voos/tipos';

type Valor = string | number | null;

export type BancoDeLeitura = {
  getFirstAsync<T>(sql: string, ...params: Valor[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...params: Valor[]): Promise<T[]>;
};

type Linha = {
  id: string;
  voo_json: string;
  tempo_escolhido_min: number;
  embarcou_em: number;
  encerrou_em: number;
  minutos_foco: number | null;
  milhas: number | null;
  resultado: string;
  categoria: string | null;
  foco: string | null;
  intervalo_servico: string;
  tarefas: number | null;
  tarefas_feitas: number | null;
};

/** Todos os voos encerrados (pousou e pousou antes), do mais recente para o mais antigo. */
export async function voosEncerrados(db: BancoDeLeitura): Promise<VooComServico[]> {
  const linhas = await db.getAllAsync<Linha>(
    `SELECT s.id, s.voo_json, s.tempo_escolhido_min, s.embarcou_em, s.encerrou_em, s.minutos_foco, s.milhas, s.resultado,
            s.intervalo_servico, m.categoria, m.foco,
            (SELECT COUNT(*) FROM tarefas t WHERE t.sessao_id = s.id AND t.texto <> '') AS tarefas,
            (SELECT COUNT(*) FROM tarefas t WHERE t.sessao_id = s.id AND t.texto <> '' AND t.feita = 1) AS tarefas_feitas
       FROM sessoes s LEFT JOIN motivos_da_viagem m ON m.sessao_id = s.id
      WHERE s.resultado IN ('pousou', 'pousou_antes')
      ORDER BY s.encerrou_em DESC`,
  );
  return linhas.map(daLinha);
}

function daLinha(l: Linha): VooComServico {
  const voo = JSON.parse(l.voo_json) as Voo;
  return {
    id: l.id,
    callsign: voo.callsign,
    companhiaPais: voo.companhiaPais,
    origem: voo.origem,
    destino: voo.destino,
    embarcouEm: l.embarcou_em,
    encerrouEm: l.encerrou_em,
    tempoEscolhidoMin: l.tempo_escolhido_min,
    minutosFoco: l.minutos_foco ?? 0,
    milhas: l.milhas ?? 0,
    resultado: l.resultado === 'pousou_antes' ? 'pousou_antes' : 'pousou',
    categoria: (l.categoria as Categoria | null) ?? null,
    foco: l.foco ?? '',
    intervaloServico: l.intervalo_servico === 'desligado' ? 'desligado' : l.intervalo_servico === '50' ? 50 : 25,
    tarefas: l.tarefas ?? 0,
    tarefasFeitas: l.tarefas_feitas ?? 0,
  };
}

export type Contagens = { saldo: number; carimbos: number; souvenirs: number };

/** Saldo (soma dos lançamentos, nunca um número solto), carimbos e souvenirs na mala. */
export async function contagens(db: BancoDeLeitura): Promise<Contagens> {
  const l = await db.getFirstAsync<{ saldo: number | null; carimbos: number; souvenirs: number }>(
    `SELECT (SELECT SUM(valor) FROM lancamentos) AS saldo,
            (SELECT COUNT(*) FROM carimbos WHERE sessao_id IS NOT NULL) AS carimbos,
            (SELECT COUNT(*) FROM souvenirs_na_mala) AS souvenirs`,
  );
  return { saldo: l?.saldo ?? 0, carimbos: l?.carimbos ?? 0, souvenirs: l?.souvenirs ?? 0 };
}

export type CarimboGravado = { id: string; aeroporto: string | null; cidade: string | null; pais: string | null; data: number };

/** Carimbos de pouso (os de nível entram com as recompensas), do mais antigo para o mais novo. */
export async function carimbos(db: BancoDeLeitura): Promise<CarimboGravado[]> {
  return db.getAllAsync<CarimboGravado>(
    'SELECT id, aeroporto, cidade, pais, data FROM carimbos WHERE sessao_id IS NOT NULL ORDER BY data ASC',
  );
}

/** Ids do catálogo dos souvenirs na mala. */
export async function souvenirsNaMala(db: BancoDeLeitura): Promise<string[]> {
  const l = await db.getAllAsync<{ souvenir_id: string }>('SELECT souvenir_id FROM souvenirs_na_mala ORDER BY comprado_em ASC');
  return l.map((x) => x.souvenir_id);
}
