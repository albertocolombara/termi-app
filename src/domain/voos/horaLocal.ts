/**
 * Hora local de onde o avião está (Infos do voo, "Hora local"; pedido do Alberto em 26/11/2026:
 * a hora do voo, não a do usuário, com o fuso).
 *
 * O fuso vem da posição pelo @photostructure/tz-lookup (CC0, tabela embutida, sem rede): em terra,
 * o fuso oficial do país (America/Sao_Paulo); no mar, o fuso náutico (Etc/GMT+2 = UTC−2).
 * A hora sai do Intl com esse fuso. Se o Intl do aparelho não souber o fuso, usa a do aparelho.
 */
import tzLookup from '@photostructure/tz-lookup';

export type HoraNoFuso = { hora: string; fuso: string | null };

export function fusoDaPosicao(lat: number, lon: number): string | null {
  try {
    return tzLookup(Math.max(-90, Math.min(90, lat)), ((((lon + 180) % 360) + 360) % 360) - 180);
  } catch {
    return null;
  }
}

/** Diferença do fuso para o UTC no instante (min), pelas partes da data no fuso. */
function deslocamentoMin(ms: number, fuso: string): number {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: fuso,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(ms));
  const v = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value);
  const comoUtc = Date.UTC(v('year'), v('month') - 1, v('day'), v('hour') % 24, v('minute'));
  return Math.round((comoUtc - Math.floor(ms / 60_000) * 60_000) / 60_000);
}

/** "UTC+1", "UTC−3", "UTC+5:30", "UTC". */
export function rotuloDoFuso(minutos: number): string {
  if (minutos === 0) return 'UTC';
  const sinal = minutos > 0 ? '+' : '−';
  const h = Math.floor(Math.abs(minutos) / 60);
  const m = Math.abs(minutos) % 60;
  return `UTC${sinal}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`;
}

export function horaNoFuso(ms: number, fuso: string | null): HoraNoFuso {
  const doAparelho = () => ({ hora: new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), fuso: null });
  if (!fuso) return doAparelho();
  try {
    const hora = new Intl.DateTimeFormat('pt-BR', { timeZone: fuso, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(ms));
    return { hora, fuso: rotuloDoFuso(deslocamentoMin(ms, fuso)) };
  } catch {
    return doAparelho();
  }
}
