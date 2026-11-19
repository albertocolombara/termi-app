/**
 * Câmera do globo. As mesmas contas rodam no shader (SkSL) e aqui, para desenhar rota, avião e
 * cidades por cima no lugar certo. Funções com 'worklet' rodam na thread de interface (Reanimated).
 *
 * Referencial: Terra como esfera de raio R (km), eixos ECEF (x para lat 0/lon 0, z para o norte).
 * A câmera olha para um ponto alvo (lat, lon), a uma distância (km), inclinada `tilt` (rad, 0 = de cima)
 * na direção oposta a `heading` (rad, a partir do norte, sentido horário), com o norte da tela = heading.
 */

export const R = 6371;
/** Campo de visão vertical (40°). */
export const FOV = (40 * Math.PI) / 180;
const K = 1 / Math.tan(FOV / 2);
const RAD = Math.PI / 180;

export type Vec3 = [number, number, number];
export type Camera = { lat: number; lon: number; dist: number; tilt: number; heading: number };
export type Basis = { pos: Vec3; f: Vec3; right: Vec3; up: Vec3 };

const dot = (a: Vec3, b: Vec3) => {
  'worklet';
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
};
const norm = (a: Vec3): Vec3 => {
  'worklet';
  const l = Math.sqrt(dot(a, a)) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const cross = (a: Vec3, b: Vec3): Vec3 => {
  'worklet';
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
};

/** Vetor unitário de uma latitude/longitude (graus). */
export function ecef(lat: number, lon: number): Vec3 {
  'worklet';
  const la = lat * RAD;
  const lo = lon * RAD;
  return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
}

/** Posição e eixos da câmera. */
export function cameraBasis(c: Camera): Basis {
  'worklet';
  const la = c.lat * RAD;
  const lo = c.lon * RAD;
  const U = ecef(c.lat, c.lon);
  const E: Vec3 = [-Math.sin(lo), Math.cos(lo), 0];
  const N: Vec3 = [-Math.sin(la) * Math.cos(lo), -Math.sin(la) * Math.sin(lo), Math.cos(la)];
  const ch = Math.cos(c.heading);
  const sh = Math.sin(c.heading);
  const H: Vec3 = [N[0] * ch + E[0] * sh, N[1] * ch + E[1] * sh, N[2] * ch + E[2] * sh];
  const ct = Math.cos(c.tilt);
  const st = Math.sin(c.tilt);
  const pos: Vec3 = [
    U[0] * R + c.dist * (U[0] * ct - H[0] * st),
    U[1] * R + c.dist * (U[1] * ct - H[1] * st),
    U[2] * R + c.dist * (U[2] * ct - H[2] * st),
  ];
  const f = norm([U[0] * R - pos[0], U[1] * R - pos[1], U[2] * R - pos[2]]);
  const right = norm(cross(H, U));
  const up = cross(right, f);
  return { pos, f, right, up };
}

/**
 * Projeta uma latitude/longitude na tela (px). Retorna null se o ponto estiver atrás do globo
 * ou atrás da câmera.
 */
export function project(lat: number, lon: number, b: Basis, w: number, h: number): [number, number] | null {
  'worklet';
  const n = ecef(lat, lon);
  const p: Vec3 = [n[0] * R, n[1] * R, n[2] * R];
  const v: Vec3 = [p[0] - b.pos[0], p[1] - b.pos[1], p[2] - b.pos[2]];
  // Lado de trás do globo: a normal aponta para longe da câmera.
  if (dot(n, v) > 0) return null;
  const z = dot(v, b.f);
  if (z <= 1) return null;
  const s = (K * h) / 2 / z;
  return [w / 2 + dot(v, b.right) * s, h / 2 - dot(v, b.up) * s];
}

/** Direção do sol (vetor unitário ECEF) num instante: ponto subsolar pela posição aparente do sol. */
export function sunEcef(ms: number): Vec3 {
  const n = ms / 864e5 + 2440587.5 - 2451545;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * RAD;
  const lam = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const eps = (23.439 - 4e-7 * n) * RAD;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam)) / RAD;
  const dec = Math.asin(Math.sin(eps) * Math.sin(lam)) / RAD;
  const gmst = (280.46061837 + 360.98564736629 * n) % 360;
  return ecef(dec, ra - gmst);
}
