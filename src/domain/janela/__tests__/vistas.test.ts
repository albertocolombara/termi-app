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
    expect(vistaEmUso('com-asa', 'primeira')).toBe('so-janela');
    expect(vistaEmUso(null, 'primeira')).toBe('so-janela');
    expect(vistaEmUso('inventada', 'primeira')).toBe('so-janela');
  });
});
