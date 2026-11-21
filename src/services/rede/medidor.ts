/**
 * Medidor de dados baixados (só em builds de teste): soma o tamanho de cada resposta do `fetch`
 * do app, separado por tipo, desde que o app abriu. Usa o cabeçalho Content-Length (o R2 e o GIBS
 * mandam). Não conta o lofi, que o serviço nativo baixa por conta própria (~40 MB por hora).
 */
export type TipoDeDado = 'voos' | 'trilha' | 'paisagem' | 'nuvens' | 'globo' | 'musica' | 'outros';

const totais: Record<TipoDeDado, { bytes: number; pedidos: number }> = {
  voos: { bytes: 0, pedidos: 0 },
  trilha: { bytes: 0, pedidos: 0 },
  paisagem: { bytes: 0, pedidos: 0 },
  nuvens: { bytes: 0, pedidos: 0 },
  globo: { bytes: 0, pedidos: 0 },
  musica: { bytes: 0, pedidos: 0 },
  outros: { bytes: 0, pedidos: 0 },
};

/** Cabeçalho que o globo põe nos pedidos de blocos da paisagem, para separar no medidor. */
export const ORIGEM_GLOBO = { 'X-Termi-Origem': 'globo' };

function tipoDa(url: string, opcoes?: RequestInit): TipoDeDado {
  if (url.includes('/historico/')) return 'trilha';
  // De perto o globo usa os blocos da paisagem (build-41: entravam como paisagem da janela).
  const h = opcoes?.headers as Record<string, string> | undefined;
  if (h?.['X-Termi-Origem'] === 'globo') return 'globo';
  if (url.includes('/voos/')) return 'voos';
  if (url.includes('/blocos/')) return 'paisagem';
  if (url.includes('/nuvens/')) return 'nuvens';
  if (url.includes('gibs.earthdata') || url.includes('/globo/')) return 'globo';
  if (url.includes('/musica/')) return 'musica';
  return 'outros';
}

let instalado = false;

export function instalarMedidorDeDados() {
  if (instalado) return;
  instalado = true;
  const original = globalThis.fetch;
  globalThis.fetch = async (entrada, opcoes) => {
    const resposta = await original(entrada, opcoes);
    const url = typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
    const t = totais[tipoDa(url, opcoes)];
    t.pedidos++;
    t.bytes += Number(resposta.headers.get('content-length') ?? 0) || 0;
    return resposta;
  };
}

export function dadosBaixados() {
  const total = Object.values(totais).reduce((s, t) => s + t.bytes, 0);
  return { total, porTipo: { ...totais } };
}
