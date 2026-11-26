import { enderecoDaFoto, lerFotoDoAviao } from '../fotoDoAviao';

const foto = {
  id: '1',
  thumbnail: { src: 'https://t.plnspttrs.net/1/1_280.jpg', size: { width: 280, height: 186 } },
  thumbnail_large: { src: 'https://t.plnspttrs.net/1/1.jpg', size: { width: 420, height: 280 } },
  link: 'https://www.planespotters.net/photo/1/pr-abc',
  photographer: ' Fulano ',
};

describe('lerFotoDoAviao', () => {
  it('usa a miniatura grande, o link e o fotógrafo, sem mudar os endereços', () => {
    expect(lerFotoDoAviao({ photos: [foto] })).toEqual({
      imagem: 'https://t.plnspttrs.net/1/1.jpg',
      largura: 420,
      altura: 280,
      link: 'https://www.planespotters.net/photo/1/pr-abc',
      fotografo: 'Fulano',
    });
  });

  it('cai para a miniatura pequena se a grande faltar', () => {
    expect(lerFotoDoAviao({ photos: [{ ...foto, thumbnail_large: undefined }] })?.largura).toBe(280);
  });

  it('sem crédito ou sem link, não mostra a foto (os termos exigem os dois)', () => {
    expect(lerFotoDoAviao({ photos: [{ ...foto, photographer: '' }] })).toBeNull();
    expect(lerFotoDoAviao({ photos: [{ ...foto, link: null }] })).toBeNull();
    expect(lerFotoDoAviao({ photos: [] })).toBeNull();
    expect(lerFotoDoAviao(null)).toBeNull();
  });
});

describe('enderecoDaFoto', () => {
  it('aceita só hex de 6 dígitos', () => {
    expect(enderecoDaFoto('E48F2A')).toBe('https://api.planespotters.net/pub/photos/hex/e48f2a');
    expect(enderecoDaFoto('~abc123')).toBe('https://api.planespotters.net/pub/photos/hex/abc123');
    expect(enderecoDaFoto('xyz')).toBeNull();
  });
});
