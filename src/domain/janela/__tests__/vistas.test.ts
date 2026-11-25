import { vistaEmUso, vistaLiberada, vistaPremium } from '../vistas';

describe('vistas da janela', () => {
  it('só a janela é grátis', () => {
    expect(vistaPremium('so-janela')).toBe(false);
    expect(vistaPremium('asa-completa')).toBe(true);
    expect(vistaLiberada('sem-moldura', 'economica')).toBe(false);
    expect(vistaLiberada('sem-moldura', 'primeira')).toBe(true);
  });

  it('usa a escolhida só se for da classe e já tiver render', () => {
    expect(vistaEmUso('asa-completa', 'primeira')).toBe('asa-completa');
    expect(vistaEmUso('asa-completa', 'economica')).toBe('so-janela');
    // Com asa e Asa e motor saíram (24/11/2026): a escolha salva volta para Janela.
    expect(vistaEmUso('com-asa', 'primeira')).toBe('so-janela');
    expect(vistaEmUso('asa-e-motor', 'primeira')).toBe('so-janela');
    expect(vistaEmUso(null, 'primeira')).toBe('so-janela');
    expect(vistaEmUso('inventada', 'primeira')).toBe('so-janela');
  });
});
