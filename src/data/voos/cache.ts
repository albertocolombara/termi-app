/**
 * Cliente do cache de voos no R2 (contrato: ARCHITECTURE §9, aprovado em 19/11/2026).
 * O app só lê arquivos estáticos; nunca consulta o provedor de voos (CLAUDE.md §7).
 *
 *   {base}/voos/indice.json            regiões publicadas e a idade de cada uma
 *   {base}/voos/{regiao}.json          voos no ar de uma região
 *   {base}/historico/{regiao}/{HHMM}.json  a mesma região na faixa de 20 min de ontem (RN-12)
 */
import type { Aeroporto, Voo } from '@/domain/voos/tipos';

export const VERSAO_CONTRATO = 1;

type AeroportoJson = { iata: string | null; icao: string | null; nome: string | null; cidade?: string | null; pais?: string | null; lat: number; lon: number };
type VooJson = {
  hex: string;
  callsign: string;
  companhia: string | null;
  companhiaPais: string | null;
  companhiaNome?: string | null;
  aeronave: string | null;
  origem: AeroportoJson;
  destino: AeroportoJson;
  lat: number;
  lon: number;
  altitudePes: number | null;
  velocidadeNos: number | null;
  rumo: number | null;
  distanciaRestanteKm: number;
  pousoPrevistoEm: string;
};
export type RegiaoJson = {
  versao: number;
  regiao: string;
  nome: string;
  coletadoEm: string;
  atribuicao: string;
  voos: VooJson[];
};
export type IndiceJson = {
  versao: number;
  atualizadoEm: string;
  regioes: Record<string, { nome: string; coletadoEm: string; voos: number }>;
};

export class ErroDoCache extends Error {}

const numero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const aeroporto = (a: AeroportoJson): Aeroporto => ({
  iata: a.iata ?? null,
  icao: a.icao ?? null,
  nome: a.nome ?? null,
  cidade: a.cidade ?? null,
  pais: a.pais ?? null,
  lat: a.lat,
  lon: a.lon,
});

/** Converte o JSON de uma região em voos do domínio. Voos com dados quebrados são ignorados, não derrubam a lista. */
export function voosDaRegiao(json: RegiaoJson): Voo[] {
  if (json?.versao !== VERSAO_CONTRATO) throw new ErroDoCache(`versão do contrato não suportada: ${json?.versao}`);
  const coletadoEm = Date.parse(json.coletadoEm);
  if (!Number.isFinite(coletadoEm)) throw new ErroDoCache('coletadoEm inválido');
  const voos: Voo[] = [];
  for (const v of json.voos ?? []) {
    const pouso = Date.parse(v.pousoPrevistoEm);
    if (!v.hex || !numero(v.lat) || !numero(v.lon) || !Number.isFinite(pouso) || !v.destino || !numero(v.destino.lat) || !numero(v.destino.lon)) continue;
    voos.push({
      hex: v.hex,
      callsign: v.callsign,
      companhia: v.companhia ?? null,
      companhiaPais: v.companhiaPais ?? null,
      companhiaNome: v.companhiaNome ?? null,
      aeronave: v.aeronave ?? null,
      origem: aeroporto(v.origem),
      destino: aeroporto(v.destino),
      lat: v.lat,
      lon: v.lon,
      altitudePes: numero(v.altitudePes) ? v.altitudePes : null,
      velocidadeNos: numero(v.velocidadeNos) ? v.velocidadeNos : null,
      rumo: numero(v.rumo) ? v.rumo : null,
      distanciaRestanteKm: v.distanciaRestanteKm,
      pousoPrevistoEm: pouso,
      coletadoEm,
      regiao: json.regiao,
    });
  }
  return voos;
}

async function json<T>(url: string, sinal?: AbortSignal): Promise<T> {
  const r = await fetch(url, { signal: sinal });
  if (!r.ok) throw new ErroDoCache(`HTTP ${r.status} em ${url}`);
  return (await r.json()) as T;
}

export type Regiao = { id: string; nome: string; coletadoEm: number; voos: number };

export async function buscarIndice(base: string, sinal?: AbortSignal): Promise<Regiao[]> {
  const i = await json<IndiceJson>(`${base}/voos/indice.json`, sinal);
  if (i.versao !== VERSAO_CONTRATO) throw new ErroDoCache(`versão do índice não suportada: ${i.versao}`);
  return Object.entries(i.regioes).map(([id, r]) => ({ id, nome: r.nome, coletadoEm: Date.parse(r.coletadoEm), voos: r.voos }));
}

/** Os voos de uma só região (para acompanhar o avião da sessão). */
export async function buscarRegiao(base: string, regiao: string, sinal?: AbortSignal): Promise<Voo[]> {
  return voosDaRegiao(await json<RegiaoJson>(`${base}/voos/${regiao}.json`, sinal));
}

export type VoosAoVivo = { voos: Voo[]; regioes: Regiao[]; atribuicao: string | null };

/** Índice + todas as regiões em paralelo. Uma região que falhar não derruba as outras. */
export async function buscarVoosAoVivo(base: string, sinal?: AbortSignal): Promise<VoosAoVivo> {
  const regioes = await buscarIndice(base, sinal);
  const arquivos = await Promise.allSettled(regioes.map((r) => json<RegiaoJson>(`${base}/voos/${r.id}.json`, sinal)));
  const voos: Voo[] = [];
  let atribuicao: string | null = null;
  for (const a of arquivos) {
    if (a.status !== 'fulfilled') continue;
    try {
      voos.push(...voosDaRegiao(a.value));
      atribuicao ??= a.value.atribuicao;
    } catch {
      // região com versão desconhecida: ignora e segue com as outras
    }
  }
  if (arquivos.length > 0 && arquivos.every((a) => a.status === 'rejected')) throw new ErroDoCache('nenhuma região respondeu');
  return { voos, regioes, atribuicao };
}

/** Faixa de 20 min do dia em UTC, igual à do coletor: "1540" para 15:47. */
export function faixaDoDia(agora: number): string {
  const d = new Date(agora);
  const min = Math.floor(d.getUTCMinutes() / 20) * 20;
  return String(d.getUTCHours()).padStart(2, '0') + String(min).padStart(2, '0');
}

const DIA = 24 * 60 * 60_000;

/**
 * Voo de ontem (RN-12): os voos da mesma faixa de horário de ontem, com os horários
 * deslocados 24 h para frente, para o resto do app tratar como um voo de agora.
 * Só aceita arquivos coletados entre 23 h e 25 h atrás.
 */
export async function buscarVoosDeOntem(base: string, regioes: string[], agora: number, sinal?: AbortSignal): Promise<Voo[]> {
  const faixa = faixaDoDia(agora);
  const arquivos = await Promise.allSettled(regioes.map((r) => json<RegiaoJson>(`${base}/historico/${r}/${faixa}.json`, sinal)));
  const voos: Voo[] = [];
  for (const a of arquivos) {
    if (a.status !== 'fulfilled') continue;
    try {
      const lista = voosDaRegiao(a.value);
      const idade = agora - (lista[0]?.coletadoEm ?? Date.parse(a.value.coletadoEm));
      if (idade < 23 * 60 * 60_000 || idade > 25 * 60 * 60_000) continue;
      voos.push(...lista.map((v) => ({ ...v, coletadoEm: v.coletadoEm + DIA, pousoPrevistoEm: v.pousoPrevistoEm + DIA })));
    } catch {
      // arquivo antigo ou quebrado: ignora
    }
  }
  return voos;
}

export type AmostraDoHistorico = { hex: string; lat: number; lon: number; em: number; destinoLat: number; destinoLon: number };

/**
 * Posições de uma região nas últimas `horas` (uma por faixa de 20 min), para montar a trilha real de um voo.
 * Arquivo que falhar é só uma amostra a menos.
 */
// Faixas do histórico já lidas nesta abertura do app (só as amostras do avião procurado).
// Uma faixa de hoje não muda até ser sobrescrita amanhã: na releitura da trilha (a cada 20 min)
// só as faixas novas são baixadas (build-37: antes baixava todas de novo, ~60 a 145 KB cada).
const faixasLidas = new Map<string, AmostraDoHistorico[]>();
const LIMITE_FAIXAS = 200;

export async function buscarAmostrasDoHistorico(
  base: string,
  regiao: string,
  agora: number,
  horas: number,
  sinal?: AbortSignal,
  hex?: string,
): Promise<AmostraDoHistorico[]> {
  const faixas = new Set<string>();
  for (let t = agora; t >= agora - horas * 3_600_000; t -= 20 * 60_000) faixas.add(faixaDoDia(t));
  const chave = (f: string) => `${base}|${regiao}|${hex ?? '*'}|${f}`;
  const faltam = [...faixas].filter((f) => !faixasLidas.has(chave(f)));
  const arquivos = await Promise.allSettled(faltam.map((f) => json<RegiaoJson>(`${base}/historico/${regiao}/${f}.json`, sinal)));
  arquivos.forEach((a, i) => {
    if (a.status !== 'fulfilled') return;
    try {
      const doArquivo: AmostraDoHistorico[] = [];
      for (const v of voosDaRegiao(a.value)) {
        if (hex && v.hex !== hex) continue;
        doArquivo.push({ hex: v.hex, lat: v.lat, lon: v.lon, em: v.coletadoEm, destinoLat: v.destino.lat, destinoLon: v.destino.lon });
      }
      // Arquivo de ontem (a faixa de hoje ainda não foi coletada): usa agora, mas não guarda.
      if (Date.parse(a.value.coletadoEm) > agora - 22 * 3_600_000) {
        faixasLidas.set(chave(faltam[i]), doArquivo);
        if (faixasLidas.size > LIMITE_FAIXAS) faixasLidas.delete(faixasLidas.keys().next().value!);
      } else {
        faixasLidas.set(`${chave(faltam[i])}|ontem`, doArquivo);
      }
    } catch {
      // arquivo antigo ou quebrado: ignora
    }
  });
  const amostras: AmostraDoHistorico[] = [];
  for (const f of faixas) {
    const lidas = faixasLidas.get(chave(f)) ?? faixasLidas.get(`${chave(f)}|ontem`);
    if (lidas) amostras.push(...lidas);
    faixasLidas.delete(`${chave(f)}|ontem`);
  }
  return amostras;
}
