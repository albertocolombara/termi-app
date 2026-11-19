import { agendaDePausas, horariosDasPausas, PAUSA_MAXIMA_MIN } from '../pausas';

describe('agendaDePausas — serviço de bordo (RN-05 a RN-07)', () => {
  it('segue os exemplos do PRD no ciclo de 25 min', () => {
    expect(agendaDePausas(52, 25)).toHaveLength(1);
    expect(agendaDePausas(90, 25)).toHaveLength(2);
    expect(agendaDePausas(180, 25)).toHaveLength(5);
  });

  it('não tem pausa em voos de até 30 min', () => {
    expect(agendaDePausas(15, 25)).toEqual([]);
    expect(agendaDePausas(30, 25)).toEqual([]);
  });

  it('exige folga mínima de 10 min depois da pausa', () => {
    // Pausa iria de 25 a 30 min: sobram 7 min em 37 → sem pausa.
    expect(agendaDePausas(37, 25)).toEqual([]);
    // Sobram exatamente 10 min em 40 → pausa permitida.
    expect(agendaDePausas(40, 25)).toEqual([{ inicioMin: 25, fimMin: 30 }]);
    // 1h30: a 3ª pausa (85–90) terminaria no pouso → só 2.
    expect(agendaDePausas(90, 25)).toEqual([
      { inicioMin: 25, fimMin: 30 },
      { inicioMin: 55, fimMin: 60 },
    ]);
  });

  it('usa pausa de no máximo 5 min também no ciclo de 50 min', () => {
    const pausas = agendaDePausas(120, 50);
    expect(pausas).toEqual([
      { inicioMin: 50, fimMin: 55 },
      { inicioMin: 105, fimMin: 110 },
    ]);
    for (const p of [...pausas, ...agendaDePausas(360, 25), ...agendaDePausas(360, 50)]) {
      expect(p.fimMin - p.inicioMin).toBeLessThanOrEqual(PAUSA_MAXIMA_MIN);
    }
  });

  it('não agenda pausas com o serviço de bordo desligado', () => {
    expect(agendaDePausas(180, 'desligado')).toEqual([]);
  });

  it('converte para horários a partir do embarque', () => {
    const embarque = Date.UTC(2026, 10, 19, 12, 0);
    expect(horariosDasPausas(embarque, [{ inicioMin: 25, fimMin: 30 }])).toEqual([
      { inicio: embarque + 25 * 60_000, fim: embarque + 30 * 60_000 },
    ]);
  });
});
