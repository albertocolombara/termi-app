import { t } from './index';
import { ptBR } from './pt-BR';

describe('t()', () => {
  it('substitui variáveis', () => {
    expect(t('avisos.pousoCorpo', { min: 25 })).toBe('25 min de voo. Abra para ver o que o voo rendeu.');
  });
  it('não usa os termos proibidos na interface', () => {
    expect(JSON.stringify(ptBR).toLowerCase()).not.toMatch(/desembarcar|desist/);
  });
});
