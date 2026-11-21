// Globo em SkSL: cada pixel lança um raio da câmera até a esfera da Terra e lê a imagem do ponto
// atingido, da mais detalhada para a mais grossa:
//   1. mosaico perto (blocos da NASA no nível certo para o zoom, 2048 px);
//   2. mosaico longe (2 níveis abaixo, cobre 16× a área);
//   3. imagem mundial (Blue Marble 4096 × 2048), para o resto do planeta.
// A noite usa o mosaico Black Marble (1024 px) e a imagem noturna mundial, misturados pela posição
// real do sol. Memória de textura: ~70 MB (perto 16 + longe 16 + noite 4 + mundo dia 32 + noite 2).
// O globo e a janela não ficam montados ao mesmo tempo.

export const TEX = {
  dia: { w: 4096, h: 2048 },
  noite: { w: 2048, h: 1024 },
  perto: 2048,
  longe: 2048,
  noiteMosaico: 1024,
} as const;

export const SKSL_GLOBO = `
uniform float2 res;
uniform float3 cp;
uniform float3 cf;
uniform float3 cr;
uniform float3 cu;
uniform float k;
uniform float3 sunD;
uniform float3 bPerto;
uniform float3 bLonge;
uniform float3 bNoite;
uniform float s2Perto;
uniform float s2Noite;

uniform shader dia;
uniform shader noite;
uniform shader perto;
uniform shader longe;
uniform shader noiteM;

const float R = 6371.0;
const float2 SZD = float2(4096.0, 2048.0);
const float2 SZN = float2(2048.0, 1024.0);
const half3 ESPACO = half3(0.004, 0.035, 0.067);
const half3 AR = half3(0.32, 0.52, 0.95);

// Posição (0..1) dentro de um mosaico [lon oeste, lat norte, lado em graus]; fora = negativo.
float2 noMosaico(float3 b, float lon, float lat) {
  return float2((lon - b.x) / b.z, (b.y - lat) / b.z);
}
float borda(float2 uv) {
  if (uv.x <= 0.0 || uv.y <= 0.0 || uv.x >= 1.0 || uv.y >= 1.0) return 0.0;
  return smoothstep(0.0, 0.04, min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y)));
}

float h21(float2 p) { p = fract(p * float2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(float2 p) {
  float2 i = floor(p); float2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + float2(1, 0)), f.x), mix(h21(i + float2(0, 1)), h21(i + float2(1, 1)), f.x), f.y);
}

half4 main(float2 xy) {
  float2 s = float2(xy.x - res.x * 0.5, res.y * 0.5 - xy.y) / (res.y * 0.5);
  float3 d = normalize(cf * k + cr * s.x + cu * s.y);
  float b = dot(cp, d);
  float c = dot(cp, cp) - R * R;
  float disc = b * b - c;

  if (disc < 0.0 || b > 0.0) {
    float dc = length(cp - d * b);
    float halo = (b < 0.0) ? smoothstep(R * 1.05, R, dc) : 0.0;
    return half4(mix(ESPACO, AR, halo * 0.45), 1.0);
  }

  float t = -b - sqrt(disc);
  float3 n = (cp + d * t) / R;
  float lat = degrees(asin(clamp(n.z, -1.0, 1.0)));
  float lon = degrees(atan(n.y, n.x));
  float2 uv = float2((lon + 180.0) / 360.0, (90.0 - lat) / 180.0);

  // Dia: mundo → longe → perto.
  half3 dayc = dia.eval(uv * SZD).rgb;
  float2 ul = noMosaico(bLonge, lon, lat);
  float wl = borda(ul);
  if (wl > 0.0) {
    half4 sl = longe.eval(ul * 2048.0);
    dayc = mix(dayc, sl.rgb, half(wl) * sl.a);
  }
  float2 up = noMosaico(bPerto, lon, lat);
  float wp = borda(up);
  if (wp > 0.0) {
    half4 sp = perto.eval(up * 2048.0);
    // Blocos do Sentinel-2 (cor calibrada para a janela) levados ao tom do Blue Marble, para não
    // saltar de cor ao passar do zoom de longe para o de perto.
    half3 cp2 = s2Perto > 0.5 ? clamp((sp.rgb - half3(0.256, 0.339, 0.209)) * 0.8 + half3(0.226, 0.22, 0.114), 0.0, 1.0) : sp.rgb;
    dayc = mix(dayc, cp2, half(wp) * sp.a);
  }

  // Noite: mundo → mosaico. Até o nível 7 o mosaico é Black Marble; de perto são as luzes l9
  // (R = área construída do WorldCover, G = luz real), como na janela: forma das quadras, brilho
  // real e pontos de luz. Sem bloco l9 = sem luz.
  half3 nightc = noite.eval(uv * SZN).rgb;
  float li = pow(clamp((float(nightc.r) - 0.06) / 0.94, 0.0, 1.0), 1.5);
  float2 un = noMosaico(bNoite, lon, lat);
  float wn = borda(un);
  if (wn > 0.0) {
    half4 sn = noiteM.eval(un * 1024.0);
    if (s2Noite > 0.5) {
      float built = float(sn.r) * float(sn.a);
      float rad = float(sn.g);
      float2 q = fract(float2(lon, lat)) * float2(111.2 * cos(radians(lat)), 111.2);
      float pts = smoothstep(0.5, 0.88, vn(q * 24.0) * 0.55 + vn(q * 65.0 + 3.1) * 0.6);
      float liN = built * (0.04 + 0.96 * pow(rad, 1.8)) * (0.22 + 0.9 * pts * sqrt(built));
      li = mix(li, liN, wn);
    } else {
      float lm = pow(clamp((float(sn.r) - 0.06) / 0.94, 0.0, 1.0), 1.5);
      li = mix(li, lm, wn * float(sn.a));
    }
  }

  float lit = smoothstep(-0.08, 0.12, dot(n, sunD));
  half3 col = dayc * half(0.2 + 0.9 * lit);
  // Noite: só as luzes das cidades. Na imagem noturna, desertos e gelo são azulados (quase sem
  // vermelho) e as cidades são claras; o canal vermelho separa os dois.
  // Curva das luzes (Alberto, build-31): o smoothstep anterior saturava a partir de 0,5 e as
  // metrópoles viravam manchas lisas. Agora a intensidade segue o brilho real (potência 1,5) e é
  // comprimida nos centros (1 - e^-x), sem estourar: centro quente e claro, periferia e estradas
  // fracas, cor do laranja das bordas ao branco quente dos centros.
  float luz = 1.0 - exp(-2.2 * li);
  half3 luzes = mix(half3(1.0, 0.55, 0.22), half3(1.0, 0.82, 0.55), half(luz)) * half(luz * 0.85);
  col = mix(col, dayc * 0.08 + luzes, half(1.0 - lit));

  float rim = pow(1.0 - max(dot(n, -d), 0.0), 3.0);
  col = mix(col, AR, half(rim * 0.45 * (0.15 + 0.85 * lit)));
  return half4(col, 1.0);
}
`;
