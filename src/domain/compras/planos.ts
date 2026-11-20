/**
 * Planos da primeira classe (PRD RN-19, Brasil, lançamento). Quando o RevenueCat entrar (Fase 4),
 * os preços passam a vir da loja; aqui ficam os valores do lançamento para o paywall de teste.
 * Honestidade comercial (RN-21): a etiqueta de economia sai da conta, não de um número fixo.
 */
export type Plano = 'anual' | 'mensal' | 'vitalicio';

export const PLANOS: readonly Plano[] = ['anual', 'mensal', 'vitalicio'];

/** Preço em centavos de real. */
export const PRECO_CENTAVOS: Record<Plano, number> = { anual: 8990, mensal: 1490, vitalicio: 17990 };

/** Só o anual tem período grátis (RN-19). */
export const DIAS_GRATIS: Record<Plano, number> = { anual: 7, mensal: 0, vitalicio: 0 };

/** Quantos dias antes da primeira cobrança o aviso chega (RN-21). */
export const AVISO_ANTES_DA_COBRANCA_DIAS = 2;

/** Economia do anual em relação a 12 meses do mensal, em % arredondado (89,90 contra 178,80 → 50). */
export function economiaDoAnual(precos: Record<Plano, number> = PRECO_CENTAVOS): number {
  const dozeMeses = precos.mensal * 12;
  if (dozeMeses <= 0) return 0;
  return Math.max(0, Math.round((1 - precos.anual / dozeMeses) * 100));
}

/** R$ 89,90 */
export function emReais(centavos: number): string {
  return `R$ ${(centavos / 100).toFixed(2).replace('.', ',')}`;
}
