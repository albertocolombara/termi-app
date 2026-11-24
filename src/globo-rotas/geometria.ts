/**
 * Geometria do globo de rotas (Início e Estatísticas): projeção ortográfica de uma esfera unitária.
 * Funções `worklet`: rodam na thread de interface a cada quadro (rotação, arcos, toque).
 *
 * Convenções:
 * - Vetor do mundo: x para leste em lon 90°, y para o norte, z saindo da tela em lat 0 / lon 0.
 * - A câmera olha para o ponto (lat = `tilt`, lon = `yaw`), em radianos; o norte fica para cima.
 * - Na tela: x para a direita, y para baixo; `z > 0` é a face visível.
 */

export type Vec3 = [number, number, number];
export type NaTela = { x: number; y: number; z: number };

const RAD = Math.PI / 180;

export function vetor(lat: number, lon: number): Vec3 {
  'worklet';
  const la = lat * RAD;
  const lo = lon * RAD;
  return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)];
}

/** Do mundo para a vista: gira o centro (lat `tilt`, lon `yaw`) para a frente da tela. */
export function paraAVista(v: Vec3, yaw: number, tilt: number): Vec3 {
  'worklet';
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const x1 = v[0] * cy - v[2] * sy;
  const z1 = v[0] * sy + v[2] * cy;
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  return [x1, v[1] * ct - z1 * st, v[1] * st + z1 * ct];
}

/** Interpolação esférica entre dois vetores unitários (grande círculo). */
export function slerp(a: Vec3, b: Vec3, u: number): Vec3 {
  'worklet';
  const d = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const ang = Math.acos(d);
  if (ang < 1e-6) return [a[0], a[1], a[2]];
  const s = Math.sin(ang);
  const wa = Math.sin((1 - u) * ang) / s;
  const wb = Math.sin(u * ang) / s;
  return [a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb];
}

/** Ângulo (rad) entre dois vetores unitários. */
export function angulo(a: Vec3, b: Vec3): number {
  'worklet';
  return Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
}

/** Pontos do arco de uma rota: sai do chão, sobe no meio (mais alto quanto mais longa) e pousa. */
export const SEGMENTOS_DO_ARCO = 40;

export function alturaDoArco(ang: number): number {
  'worklet';
  return Math.min(0.32, 0.05 + ang * 0.12);
}

export function projetar(v: Vec3, elevacao: number, yaw: number, tilt: number, cx: number, cy: number, raio: number): NaTela {
  'worklet';
  const p = paraAVista(v, yaw, tilt);
  return { x: cx + p[0] * raio * elevacao, y: cy - p[1] * raio * elevacao, z: p[2] };
}

/** Pontos do arco já projetados na tela. */
export function arcoNaTela(a: Vec3, b: Vec3, yaw: number, tilt: number, cx: number, cy: number, raio: number): NaTela[] {
  'worklet';
  const h = alturaDoArco(angulo(a, b));
  const pts: NaTela[] = [];
  for (let k = 0; k <= SEGMENTOS_DO_ARCO; k++) {
    const u = k / SEGMENTOS_DO_ARCO;
    pts.push(projetar(slerp(a, b, u), 1 + Math.sin(Math.PI * u) * h, yaw, tilt, cx, cy, raio));
  }
  return pts;
}

/**
 * Um ponto do arco está escondido se está do lado de trás do globo (z < 0). Inclui o trecho elevado
 * que passaria da borda: o globo é opaco e nada do outro lado aparece (Alberto, build-47).
 */
export function escondido(p: NaTela): boolean {
  'worklet';
  return p.z < 0;
}

/** Distância de um ponto a um segmento, na tela. */
export function distanciaAoSegmento(px: number, py: number, a: NaTela, b: NaTela): number {
  'worklet';
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / l2));
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}

/**
 * Rota mais perto do toque, entre as partes visíveis dos arcos. Devolve o índice ou -1.
 * `limite` em pontos da tela (área de toque generosa: os arcos são finos).
 */
export function rotaNoToque(
  px: number,
  py: number,
  rotas: readonly { a: Vec3; b: Vec3 }[],
  yaw: number,
  tilt: number,
  cx: number,
  cy: number,
  raio: number,
  limite: number,
): number {
  'worklet';
  let melhor = -1;
  let menor = limite;
  for (let i = 0; i < rotas.length; i++) {
    const pts = arcoNaTela(rotas[i].a, rotas[i].b, yaw, tilt, cx, cy, raio);
    for (let k = 0; k < pts.length - 1; k++) {
      if (escondido(pts[k])) continue;
      const d = distanciaAoSegmento(px, py, pts[k], pts[k + 1]);
      if (d < menor) {
        menor = d;
        melhor = i;
      }
    }
  }
  return melhor;
}

/** Centro da câmera (yaw, tilt) que mostra o meio de uma rota. */
export function centroDaRota(a: Vec3, b: Vec3): { yaw: number; tilt: number } {
  'worklet';
  const m = slerp(a, b, 0.5);
  return { yaw: Math.atan2(m[0], m[2]), tilt: Math.asin(Math.max(-1, Math.min(1, m[1]))) };
}

/** Ângulo equivalente a `alvo` mais perto de `atual` (a câmera gira pelo caminho curto). */
export function maisPerto(atual: number, alvo: number): number {
  'worklet';
  const d = ((((alvo - atual) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
  return atual + d;
}
