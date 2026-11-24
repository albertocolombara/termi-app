import { arcoNaTela, centroDaRota, escondido, maisPerto, paraAVista, projetar, rotaNoToque, slerp, vetor } from '../geometria';

const RAD = Math.PI / 180;

describe('geometria do globo de rotas', () => {
  it('o centro da câmera fica no meio da tela, de frente', () => {
    const v = vetor(41.3, 2.08);
    const p = paraAVista(v, 2.08 * RAD, 41.3 * RAD);
    expect(p[0]).toBeCloseTo(0, 6);
    expect(p[1]).toBeCloseTo(0, 6);
    expect(p[2]).toBeCloseTo(1, 6);
  });

  it('o norte fica para cima e o leste para a direita', () => {
    const norte = projetar(vetor(10, 0), 1, 0, 0, 100, 100, 50);
    const leste = projetar(vetor(0, 10), 1, 0, 0, 100, 100, 50);
    expect(norte.y).toBeLessThan(100);
    expect(leste.x).toBeGreaterThan(100);
  });

  it('o lado oposto do planeta fica escondido', () => {
    const atras = projetar(vetor(0, 180), 1, 0, 0, 100, 100, 50);
    expect(atras.z).toBeLessThan(0);
    expect(escondido(atras)).toBe(true);
  });

  it('o arco começa e termina nos aeroportos e sobe no meio', () => {
    const a = vetor(41.3, 2.08);
    const b = vetor(51.47, -0.45);
    const pts = arcoNaTela(a, b, 0, 0, 0, 0, 1);
    const ini = projetar(a, 1, 0, 0, 0, 0, 1);
    expect(pts[0].x).toBeCloseTo(ini.x, 6);
    expect(pts[0].y).toBeCloseTo(ini.y, 6);
    const meio = pts[pts.length >> 1];
    const meioNoChao = projetar(slerp(a, b, 0.5), 1, 0, 0, 0, 0, 1);
    expect(Math.hypot(meio.x, meio.y)).toBeGreaterThan(Math.hypot(meioNoChao.x, meioNoChao.y));
  });

  it('acha a rota tocada e ignora toques longe', () => {
    const rotas = [
      { a: vetor(41.3, 2.08), b: vetor(51.47, -0.45) },
      { a: vetor(-23.4, -46.5), b: vetor(-34.8, -58.5) },
    ];
    const meio = arcoNaTela(rotas[1].a, rotas[1].b, 0, 0, 200, 200, 150)[20];
    expect(rotaNoToque(meio.x, meio.y, rotas, 0, 0, 200, 200, 150, 20)).toBe(1);
    expect(rotaNoToque(5, 5, rotas, 0, 0, 200, 200, 150, 20)).toBe(-1);
  });

  it('centraliza no meio da rota', () => {
    const c = centroDaRota(vetor(0, -10), vetor(0, 10));
    expect(c.yaw).toBeCloseTo(0, 6);
    expect(c.tilt).toBeCloseTo(0, 6);
  });

  it('gira pelo caminho curto', () => {
    expect(maisPerto(3, -3)).toBeCloseTo(-3 + 2 * Math.PI, 6);
    expect(maisPerto(0, 1)).toBeCloseTo(1, 6);
  });
});
