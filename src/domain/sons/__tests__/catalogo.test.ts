import { somEmUso, somLiberado } from '../catalogo';

describe('sons de fundo', () => {
  it('motores e ruído branco são grátis', () => {
    expect(somLiberado('motores', 'economica')).toBe(true);
    expect(somLiberado('ruido-branco', 'economica')).toBe(true);
    expect(somLiberado('chuva', 'economica')).toBe(false);
    expect(somLiberado('chuva', 'primeira')).toBe(true);
  });

  it('cai para os motores quando o escolhido não vale, e respeita "sem som"', () => {
    expect(somEmUso(null, 'economica')).toBe('motores');
    expect(somEmUso('cabine', 'economica')).toBe('motores');
    expect(somEmUso('cabine', 'primeira')).toBe('cabine');
    expect(somEmUso('lofi', 'primeira')).toBe('motores');
    expect(somEmUso('nenhum', 'primeira')).toBeNull();
  });
});
