import { alternarCategoria, comparacaoComOMundo, milhasPorDia, planoDoTempo, projecao } from '../plano';

describe('plano do onboarding', () => {
  it('alterna categorias mantendo a ordem do catálogo', () => {
    expect(alternarCategoria(['estudo', 'trabalho'], 'leitura')).toEqual(['estudo', 'trabalho', 'leitura']);
    expect(alternarCategoria(['estudo', 'trabalho'], 'estudo')).toEqual(['trabalho']);
    expect(alternarCategoria(['outro'], 'estudo')).toEqual(['estudo', 'outro']);
  });

  it('cada tempo do OB4 define o dial e o intervalo do serviço de bordo', () => {
    expect(planoDoTempo('15')).toEqual({ tempoMin: 15, servicoDeBordo: 25 });
    expect(planoDoTempo('25')).toEqual({ tempoMin: 25, servicoDeBordo: 25 });
    expect(planoDoTempo('50')).toEqual({ tempoMin: 50, servicoDeBordo: 50 });
    expect(planoDoTempo('90')).toEqual({ tempoMin: 90, servicoDeBordo: 50 });
  });

  it('milhas por dia a ~540 milhas por hora', () => {
    expect(milhasPorDia(2)).toBe(1080);
    expect(milhasPorDia(0)).toBe(0);
  });

  it('projeção de 30 dias do Figma: 2 h/dia → 60 h, 32.400 milhas, Explorador em 28 h', () => {
    const p = projecao(2);
    expect(p.horas).toBe(60);
    expect(p.milhas).toBe(32_400);
    expect(p.status.id).toBe('explorador');
    expect(p.horasAteOStatus).toBe(28);
    expect(comparacaoComOMundo(p.voltas)).toEqual({ tipo: 'mais-que', voltas: 1 });
  });

  it('metas maiores alcançam status maiores', () => {
    expect(projecao(4).status.id).toBe('desbravador');
    expect(projecao(6).status.id).toBe('cidadao-do-mundo');
    expect(projecao(1).milhas).toBe(16_200);
    expect(comparacaoComOMundo(projecao(1).voltas)).toEqual({ tipo: 'parte', porcento: 65 });
  });

  it('sem meta, mostra o primeiro nível como alvo', () => {
    expect(projecao(0).status.id).toBe('mochileiro');
  });
});
