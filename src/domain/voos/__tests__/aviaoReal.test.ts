import { aviaoReal, LEITURA_RECENTE_MS } from '../aviaoReal';
import { AGORA, voo } from './fabrica';

const MIN = 60_000;

describe('aviaoReal', () => {
  it('leitura recente do radar com o avião voando: no ar', () => {
    expect(aviaoReal(voo(10), 'ok', AGORA + 5 * MIN)).toBe('no-ar');
  });
  it('no destino e baixo: pousou', () => {
    expect(aviaoReal(voo(0, { distanciaRestanteKm: 2, altitudePes: 0 }), 'ok', AGORA)).toBe('pousou');
  });
  it('leitura velha ou sem sinal antes da previsão do avião: não sabe (o voo pousa no horário do usuário)', () => {
    expect(aviaoReal(voo(60), 'ok', AGORA + LEITURA_RECENTE_MS + MIN)).toBe('desconhecido');
    expect(aviaoReal(voo(60), 'sem-sinal', AGORA + 5 * MIN)).toBe('desconhecido');
    expect(aviaoReal(voo(60), 'fora-da-area', AGORA + 5 * MIN)).toBe('desconhecido');
  });
  it('sem leitura nova depois da previsão do avião: pousou', () => {
    expect(aviaoReal(voo(10), 'sem-sinal', AGORA + 11 * MIN)).toBe('pousou');
  });
});

describe('aviaoReal depois da previsão', () => {
  it('passou da previsão de pouso do avião real: pousou, mesmo com leitura recente (build-66)', () => {
    expect(aviaoReal(voo(10), 'ok', AGORA + 11 * 60_000)).toBe('pousou');
  });
});
