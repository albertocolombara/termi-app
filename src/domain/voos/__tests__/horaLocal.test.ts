import { fusoDaPosicao, horaNoFuso, rotuloDoFuso } from '../horaLocal';

// 26/11/2026 15:20 UTC.
const T = Date.UTC(2026, 10, 26, 15, 20);

describe('hora local do voo', () => {
  it('acha o fuso pela posição, em terra e no mar', () => {
    expect(fusoDaPosicao(48.85, 2.35)).toBe('Europe/Paris');
    expect(fusoDaPosicao(-23.5, -46.6)).toBe('America/Sao_Paulo');
    expect(fusoDaPosicao(0, -30)).toBe('Etc/GMT+2');
  });

  it('mostra a hora do lugar com o fuso', () => {
    expect(horaNoFuso(T, 'Europe/Paris')).toEqual({ hora: '16:20', fuso: 'UTC+1' });
    expect(horaNoFuso(T, 'America/Sao_Paulo')).toEqual({ hora: '12:20', fuso: 'UTC−3' });
    expect(horaNoFuso(T, 'Asia/Kolkata')).toEqual({ hora: '20:50', fuso: 'UTC+5:30' });
    expect(horaNoFuso(T, 'Etc/GMT+2')).toEqual({ hora: '13:20', fuso: 'UTC−2' });
  });

  it('sem fuso, usa a hora do aparelho', () => {
    expect(horaNoFuso(T, null).fuso).toBeNull();
    expect(horaNoFuso(T, 'Fuso/Inexistente').fuso).toBeNull();
  });

  it('rótulo do fuso', () => {
    expect(rotuloDoFuso(0)).toBe('UTC');
    expect(rotuloDoFuso(-180)).toBe('UTC−3');
  });
});
