import { cameraBasis, ecef, project, sunEcef } from '../camera';

const W = 400;
const H = 800;

describe('câmera do globo', () => {
  it('põe o alvo no centro da tela, de cima e inclinada', () => {
    for (const tilt of [0, 0.9]) {
      const b = cameraBasis({ lat: 46, lon: 1, dist: 1500, tilt, heading: 0.4 });
      const p = project(46, 1, b, W, H)!;
      expect(p[0]).toBeCloseTo(W / 2, 3);
      expect(p[1]).toBeCloseTo(H / 2, 3);
    }
  });

  it('com o norte para cima, um ponto ao norte fica acima e um a leste fica à direita', () => {
    const b = cameraBasis({ lat: 46, lon: 1, dist: 1500, tilt: 0, heading: 0 });
    const norte = project(48, 1, b, W, H)!;
    const leste = project(46, 3, b, W, H)!;
    expect(norte[1]).toBeLessThan(H / 2);
    expect(Math.abs(norte[0] - W / 2)).toBeLessThan(1);
    expect(leste[0]).toBeGreaterThan(W / 2);
  });

  it('com o rumo para leste, o leste fica para cima', () => {
    const b = cameraBasis({ lat: 0, lon: 0, dist: 1500, tilt: 0, heading: Math.PI / 2 });
    const leste = project(0, 2, b, W, H)!;
    expect(leste[1]).toBeLessThan(H / 2);
  });

  it('esconde pontos do outro lado do globo', () => {
    const b = cameraBasis({ lat: 0, lon: 0, dist: 20000, tilt: 0, heading: 0 });
    expect(project(0, 180, b, W, H)).toBeNull();
    expect(project(0, 10, b, W, H)).not.toBeNull();
  });

  it('acha o sol perto do equador ao meio-dia UTC num equinócio', () => {
    const s = sunEcef(Date.UTC(2026, 2, 20, 12, 0));
    const lat = (Math.asin(s[2]) * 180) / Math.PI;
    const lon = (Math.atan2(s[1], s[0]) * 180) / Math.PI;
    expect(Math.abs(lat)).toBeLessThan(1.5);
    expect(Math.abs(lon)).toBeLessThan(5);
  });

  it('ecef dá vetores unitários', () => {
    const v = ecef(51.47, -0.45);
    expect(Math.hypot(...v)).toBeCloseTo(1, 10);
  });
});
