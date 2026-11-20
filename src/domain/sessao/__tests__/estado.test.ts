import { estadoDaSessao, type Sessao } from '../estado';
import { agendaDePausas } from '../pausas';

const T0 = Date.UTC(2026, 10, 20, 12, 0);
const min = (m: number) => T0 + m * 60_000;
const sessao = (extra: Partial<Sessao> = {}): Sessao => ({
  embarcouEm: T0,
  pousoPrevistoEm: min(55),
  pausas: agendaDePausas(55, 25), // uma pausa: 25–30 min
  ...extra,
});

describe('estadoDaSessao', () => {
  it('em voo e no serviço de bordo pelo relógio', () => {
    expect(estadoDaSessao(sessao(), min(10), 'no-ar')).toEqual({ tipo: 'em-voo' });
    expect(estadoDaSessao(sessao(), min(26), 'no-ar')).toEqual({ tipo: 'servico-de-bordo', indice: 0, terminaEm: min(30) });
    expect(estadoDaSessao(sessao(), min(31), 'no-ar')).toEqual({ tipo: 'em-voo' });
  });

  it('"Voltar ao foco" encerra a pausa antes (RN-06)', () => {
    expect(estadoDaSessao(sessao({ voltouAntes: { 0: min(27) } }), min(28), 'no-ar')).toEqual({ tipo: 'em-voo' });
  });

  it('Em solo: avião real pousou antes do horário, o foco segue (RN-09b)', () => {
    expect(estadoDaSessao(sessao(), min(50), 'pousou')).toEqual({ tipo: 'em-solo' });
  });

  it('no horário é pouso completo, com o avião real no ar ou não (RN-09)', () => {
    expect(estadoDaSessao(sessao(), min(55), 'pousou')).toEqual({ tipo: 'pousou', em: min(55) });
    expect(estadoDaSessao(sessao(), min(70), 'desconhecido')).toEqual({ tipo: 'pousou', em: min(55) });
  });

  it('Em espera: horário chegou e o avião real segue no ar (RN-09a)', () => {
    expect(estadoDaSessao(sessao(), min(56), 'no-ar')).toEqual({ tipo: 'em-espera' });
  });

  it('Continuar até o pouso termina quando o avião pousa', () => {
    const s = sessao({ continuarAtePousoDesde: min(56) });
    expect(estadoDaSessao(s, min(60), 'no-ar')).toEqual({ tipo: 'continuando-ate-o-pouso' });
    expect(estadoDaSessao(s, min(64), 'pousou')).toEqual({ tipo: 'pousou', em: min(64) });
  });

  it('encerramentos registrados mandam no estado', () => {
    expect(estadoDaSessao(sessao({ encerramento: { em: min(20), tipo: 'pousar-antes' } }), min(40), 'no-ar')).toEqual({
      tipo: 'pousou-antes',
      em: min(20),
    });
    expect(estadoDaSessao(sessao({ encerramento: { em: min(62), tipo: 'pouso' } }), min(90), 'no-ar')).toEqual({
      tipo: 'pousou',
      em: min(62),
    });
  });
});
