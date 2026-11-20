import { AGORA, voo } from '../../voos/__tests__/fabrica';
import { fimPousandoAntes, fimPousando, tempoCumprido } from '../encerramento';
import { rendimentos } from '../rendimentos';

const MIN = 60_000;

describe('encerramento da sessão', () => {
  const v = voo(52);
  const s = { voo: v, embarcouEm: AGORA, pousoPrevistoEm: AGORA + 52 * MIN };

  it('pousar antes rende os minutos e o trecho voado, sem carimbo', () => {
    const r = rendimentos(fimPousandoAntes(s, AGORA + 31 * MIN + 40_000));
    expect(r.minutos).toBe(31);
    expect(r.dolares).toBe(31);
    expect(r.carimbo).toBe(false);
    expect(r.milhas).toBeGreaterThan(0);
  });

  it('pouso com o app fechado conta só até o horário de pouso', () => {
    const f = fimPousando(s);
    expect(f.encerrouEm).toBe(s.pousoPrevistoEm);
    const r = rendimentos(f);
    expect(r.minutos).toBe(52);
    expect(r.carimbo).toBe(true);
  });

  it('continuar até o pouso soma os minutos a mais', () => {
    expect(rendimentos(fimPousando(s, AGORA + 60 * MIN)).minutos).toBe(60);
  });

  it('as milhas do pouso cobrem mais chão que as de pousar antes', () => {
    expect(fimPousando(s).milhas).toBeGreaterThan(fimPousandoAntes(s, AGORA + 20 * MIN).milhas);
  });

  it('sabe quando o tempo foi cumprido', () => {
    expect(tempoCumprido(AGORA, AGORA - 1)).toBe(false);
    expect(tempoCumprido(AGORA, AGORA)).toBe(true);
  });
});
