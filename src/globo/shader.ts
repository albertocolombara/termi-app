// Globo em SkSL: cada pixel lança um raio da câmera até a esfera da Terra e lê a textura do ponto
// atingido. Dia: Blue Marble mundial (4096 × 2048), com o mesmo recorte detalhado da Europa usado na
// janela. Noite: Black Marble (2048 × 1024), misturado pela posição real do sol. Atmosfera na borda.
// Memória de textura: ~55 MB (32 + 8 + 14). O globo e a janela não ficam montados ao mesmo tempo.

export const TEX = {
  dia: { w: 4096, h: 2048 },
  noite: { w: 2048, h: 1024 },
  regiao: { w: 2048, h: 1792 },
} as const;

export const SKSL_GLOBO = `
uniform float2 res;
uniform float3 cp;
uniform float3 cf;
uniform float3 cr;
uniform float3 cu;
uniform float k;
uniform float3 sunD;

uniform shader dia;
uniform shader noite;
uniform shader regiao;

const float R = 6371.0;
const float2 SZD = float2(4096.0, 2048.0);
const float2 SZN = float2(2048.0, 1024.0);
const float2 SZB = float2(2048.0, 1792.0);
const half3 ESPACO = half3(0.004, 0.035, 0.067);
const half3 AR = half3(0.32, 0.52, 0.95);

half4 main(float2 xy) {
  float2 s = float2(xy.x - res.x * 0.5, res.y * 0.5 - xy.y) / (res.y * 0.5);
  float3 d = normalize(cf * k + cr * s.x + cu * s.y);
  float b = dot(cp, d);
  float c = dot(cp, cp) - R * R;
  float disc = b * b - c;

  if (disc < 0.0 || b > 0.0) {
    // Fora da Terra: espaço com o halo da atmosfera em volta do globo.
    float dc = length(cp - d * b);
    float halo = (b < 0.0) ? smoothstep(R * 1.05, R, dc) : 0.0;
    return half4(mix(ESPACO, AR, halo * 0.45), 1.0);
  }

  float t = -b - sqrt(disc);
  float3 n = (cp + d * t) / R;
  float latD = degrees(asin(clamp(n.z, -1.0, 1.0)));
  float lonD = degrees(atan(n.y, n.x));
  float2 uv = float2((lonD + 180.0) / 360.0, (90.0 - latD) / 180.0);

  half3 dayc = dia.eval(uv * SZD).rgb;
  // Detalhe da Europa (mesmo recorte da janela: lon -18 a 18, lat 31,5 a 63).
  float2 tb = float2((lonD + 18.0) / 36.0, (63.0 - latD) / 31.5);
  if (tb.x > 0.0 && tb.y > 0.0 && tb.x < 1.0 && tb.y < 1.0) {
    float e = min(min(tb.x, 1.0 - tb.x), min(tb.y, 1.0 - tb.y));
    dayc = mix(dayc, regiao.eval(tb * SZB).rgb, half(smoothstep(0.0, 0.05, e)));
  }
  half3 nightc = noite.eval(uv * SZN).rgb;

  float lit = smoothstep(-0.08, 0.12, dot(n, sunD));
  half3 col = dayc * half(0.2 + 0.9 * lit);
  // Noite: só as luzes das cidades, sobre a terra quase escura. Na textura noturna, desertos e gelo
  // são azulados (quase sem vermelho) e as cidades são claras; o canal vermelho separa os dois.
  half3 luzes = half(smoothstep(0.06, 0.35, float(nightc.r))) * half3(1.0, 0.8, 0.5);
  col = mix(col, dayc * 0.08 + luzes * 1.6, half(1.0 - lit));

  float rim = pow(1.0 - max(dot(n, -d), 0.0), 3.0);
  col = mix(col, AR, half(rim * 0.45 * (0.15 + 0.85 * lit)));
  return half4(col, 1.0);
}
`;
