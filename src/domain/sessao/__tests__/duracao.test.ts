import { validarDuracao } from '../duracao';

describe('validarDuracao (RN-01)', () => {
  it('não aceita menos de 15 min', () => {
    expect(validarDuracao(14, 'primeira')).toEqual({ ok: false, motivo: 'abaixo-do-minimo' });
    expect(validarDuracao(15, 'economica')).toEqual({ ok: true });
  });

  it('libera até 3 h na econômica e marca acima disso como primeira classe', () => {
    expect(validarDuracao(180, 'economica')).toEqual({ ok: true });
    expect(validarDuracao(181, 'economica')).toEqual({ ok: false, motivo: 'primeira-classe' });
  });

  it('libera até 6 h na primeira classe', () => {
    expect(validarDuracao(360, 'primeira')).toEqual({ ok: true });
    expect(validarDuracao(361, 'primeira')).toEqual({ ok: false, motivo: 'acima-do-maximo' });
  });
});
