import { minutosDesde, nomeDaAeronave, pontoCardeal } from '../infoDoVoo';

describe('nomeDaAeronave', () => {
  it('traduz os códigos comuns e mantém os outros', () => {
    expect(nomeDaAeronave('A359')).toBe('Airbus A350-900');
    expect(nomeDaAeronave('b38m')).toBe('Boeing 737 MAX 8');
    expect(nomeDaAeronave('E295')).toBe('Embraer E195-E2');
    expect(nomeDaAeronave('GLF6')).toBe('GLF6');
    expect(nomeDaAeronave(null)).toBeNull();
  });
});

describe('pontoCardeal', () => {
  it('arredonda para o ponto mais perto', () => {
    expect(pontoCardeal(0)).toBe('N');
    expect(pontoCardeal(44)).toBe('NE');
    expect(pontoCardeal(90)).toBe('L');
    expect(pontoCardeal(250)).toBe('O');
    expect(pontoCardeal(337.6)).toBe('N');
    expect(pontoCardeal(-45)).toBe('NO');
  });
});

describe('minutosDesde', () => {
  it('conta minutos inteiros, nunca negativos', () => {
    expect(minutosDesde(0, 125_000)).toBe(2);
    expect(minutosDesde(10_000, 0)).toBe(0);
  });
});
