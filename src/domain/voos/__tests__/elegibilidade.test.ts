import { temposProximos, voosElegiveis } from '../elegibilidade';
import { AGORA, voo } from './fabrica';

describe('voosElegiveis (RN-02)', () => {
  const voos = [voo(40), voo(52), voo(60), voo(61), voo(71), voo(49)];

  it('aceita pouso a até 10 min do tempo escolhido, do mais próximo ao mais distante', () => {
    const r = voosElegiveis(voos, 50, AGORA, 'economica').map((e) => e.minutosAtePouso);
    expect(r).toEqual([49, 52, 40, 60]);
  });

  it('respeita o mínimo de 15 min (RN-01)', () => {
    const r = voosElegiveis([voo(8), voo(14), voo(15), voo(24)], 15, AGORA, 'economica').map((e) => e.minutosAtePouso);
    expect(r).toEqual([15, 24]);
  });

  it('na econômica, não oferece voo acima de 3 h; na primeira classe, sim', () => {
    const v = [voo(175), voo(185)];
    expect(voosElegiveis(v, 180, AGORA, 'economica').map((e) => e.minutosAtePouso)).toEqual([175]);
    expect(voosElegiveis(v, 180, AGORA, 'primeira').map((e) => e.minutosAtePouso)).toEqual([175, 185]);
  });

  it('não repete o mesmo avião vindo de duas regiões', () => {
    expect(voosElegiveis([voo(50), voo(50)], 50, AGORA, 'economica')).toHaveLength(1);
  });

  it('usa o horário atual: o voo coletado há 10 min está 10 min mais perto do pouso', () => {
    expect(voosElegiveis([voo(60)], 50, AGORA + 10 * 60_000, 'economica')[0].minutosAtePouso).toBe(50);
  });
});

describe('temposProximos (sem voo elegível)', () => {
  it('sugere tempos com voos, perto do escolhido', () => {
    expect(temposProximos([voo(95), voo(130)], 60, AGORA, 'economica')).toEqual([95, 130]);
  });

  it('não repete a mesma duração e fica com as mais próximas', () => {
    expect(temposProximos([voo(93), voo(96), voo(20), voo(150), voo(175)], 60, AGORA, 'economica', 2)).toEqual([20, 95]);
  });

  it('não sugere acima do limite da classe', () => {
    expect(temposProximos([voo(200)], 170, AGORA, 'economica')).toEqual([]);
  });
});
