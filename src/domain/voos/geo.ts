/**
 * Geometria na esfera para posição e milhas. Sem dependências.
 * As milhas do app são milhas terrestres (1.609 m): ~540 por hora de jato (visão do produto).
 */

export const RAIO_TERRA_KM = 6371;
export const KM_POR_MILHA = 1.609344;

export type Ponto = { lat: number; lon: number };

const rad = (g: number) => (g * Math.PI) / 180;
const graus = (r: number) => (r * 180) / Math.PI;

/** Distância em km pelo grande círculo (haversine). */
export function distanciaKm(a: Ponto, b: Ponto): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * RAIO_TERRA_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const kmParaMilhas = (km: number) => km / KM_POR_MILHA;

/** Ponto a uma fração `f` (0–1) do caminho entre `a` e `b` pelo grande círculo. */
export function interpolar(a: Ponto, b: Ponto, f: number): Ponto {
  const d = distanciaKm(a, b) / RAIO_TERRA_KM;
  if (d < 1e-9) return { lat: a.lat, lon: a.lon };
  const s = Math.sin(d);
  const k1 = Math.sin((1 - f) * d) / s;
  const k2 = Math.sin(f * d) / s;
  const [la1, lo1, la2, lo2] = [rad(a.lat), rad(a.lon), rad(b.lat), rad(b.lon)];
  const x = k1 * Math.cos(la1) * Math.cos(lo1) + k2 * Math.cos(la2) * Math.cos(lo2);
  const y = k1 * Math.cos(la1) * Math.sin(lo1) + k2 * Math.cos(la2) * Math.sin(lo2);
  const z = k1 * Math.sin(la1) + k2 * Math.sin(la2);
  return { lat: graus(Math.atan2(z, Math.hypot(x, y))), lon: graus(Math.atan2(y, x)) };
}

/** Rumo inicial (0–360°, 0 = norte) de `a` para `b`. */
export function rumo(a: Ponto, b: Ponto): number {
  const [la1, la2, dLon] = [rad(a.lat), rad(b.lat), rad(b.lon - a.lon)];
  const y = Math.sin(dLon) * Math.cos(la2);
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLon);
  return (graus(Math.atan2(y, x)) + 360) % 360;
}
