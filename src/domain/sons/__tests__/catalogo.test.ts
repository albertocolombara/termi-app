import { SOM_PADRAO, somEmUso, somLiberado } from '../catalogo';

describe('sons de fundo', () => {
  it('voo de cruzeiro e ruído branco são grátis; motores, cabine, chuva e lofi são da primeira classe', () => {
    expect(somLiberado('cruzeiro', 'economica')).toBe(true);
    expect(somLiberado('ruido-branco', 'economica')).toBe(true);
    expect(somLiberado('motores', 'economica')).toBe(false);
    expect(somLiberado('motores', 'primeira')).toBe(true);
    expect(somLiberado('chuva', 'economica')).toBe(false);
    expect(somLiberado('lofi', 'primeira')).toBe(true);
  });

  it('cai para o voo de cruzeiro quando o escolhido não vale, e respeita "sem som"', () => {
    expect(SOM_PADRAO).toBe('cruzeiro');
    expect(somEmUso(null, 'economica')).toBe('cruzeiro');
    expect(somEmUso('motores', 'economica')).toBe('cruzeiro'); // quem escolheu motores antes de virar primeira classe
    expect(somEmUso('cabine', 'economica')).toBe('cruzeiro');
    expect(somEmUso('cabine', 'primeira')).toBe('cabine');
    expect(somEmUso('lofi', 'primeira')).toBe('lofi');
    expect(somEmUso('nenhum', 'primeira')).toBeNull();
  });
});
