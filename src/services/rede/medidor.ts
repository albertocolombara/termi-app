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

function tipoDa(url: string): TipoDeDado {
  if (url.includes('/historico/')) return 'trilha';
  if (url.includes('/voos/')) return 'voos';
  if (url.includes('/blocos/')) return 'paisagem';
  if (url.includes('/nuvens/')) return 'nuvens';
  if (url.includes('gibs.earthdata')) return 'globo';
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
    const t = totais[tipoDa(url)];
    t.pedidos++;
    t.bytes += Number(resposta.headers.get('content-length') ?? 0) || 0;
    return resposta;
  };
}

export function dadosBaixados() {
  const total = Object.values(totais).reduce((s, t) => s + t.bytes, 0);
  return { total, porTipo: { ...totais } };
}
