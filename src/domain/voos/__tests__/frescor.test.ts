import { frescorDoCache } from '../frescor';

const AGORA = Date.UTC(2026, 10, 20, 12, 0);

describe('frescorDoCache', () => {
  it('ao vivo se alguma região é recente', () => {
    expect(frescorDoCache([AGORA - 90 * 60_000, AGORA - 15 * 60_000], AGORA, 45)).toBe('ao-vivo');
  });
  it('fora do ar se todas passaram do limite ou não há regiões', () => {
    expect(frescorDoCache([AGORA - 50 * 60_000], AGORA, 45)).toBe('fora-do-ar');
    expect(frescorDoCache([], AGORA, 45)).toBe('fora-do-ar');
  });
});
