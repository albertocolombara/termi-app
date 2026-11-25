// Globo pontilhado em SkSL (Início e Estatísticas).
//
// Cada pixel dentro do disco vira um ponto da esfera (projeção ortográfica), é girado de volta para
// latitude e longitude e cai numa grade de pontos com espaçamento quase igual em todo o planeta:
// faixas de latitude com `linhas` faixas e, em cada faixa, um número de pontos proporcional ao
// cosseno da latitude. O ponto da grade só aparece se a máscara de terra (1024 × 512) for branca
// no centro dele. Fora do disco, um halo azulado.
//
// O custo é fixo por pixel (não depende de quantos pontos existem) e a textura tem ~2 MB na GPU.

export const MASCARA = { w: 1024, h: 512 } as const;

export const SKSL_GLOBO_DE_ROTAS = `
uniform float2 centro;
uniform float raio;
uniform float yaw;
uniform float tilt;
uniform float linhas;
uniform half4 corTerra;
uniform half4 corMarCentro;
uniform half4 corMarBorda;
uniform half4 corHalo;
uniform shader mascara;

const float PI = 3.14159265;

half4 main(float2 xy) {
  float2 p = (xy - centro) / raio;
  p.y = -p.y;
  float r = length(p);
  float px = 1.0 / raio;

  // Halo: decai rápido para fora da borda.
  if (r > 1.0) {
    float a = exp(-(r - 1.0) * 9.0) * float(corHalo.a);
    return half4(corHalo.rgb * half(a), half(a));
  }

  float z = sqrt(max(0.0, 1.0 - r * r));
  float ct = cos(tilt);
  float st = sin(tilt);
  float y1 = p.y * ct + z * st;
  float z1 = -p.y * st + z * ct;
  float cy = cos(yaw);
  float sy = sin(yaw);
  float wx = p.x * cy + z1 * sy;
  float wz = -p.x * sy + z1 * cy;
  float lat = asin(clamp(y1, -1.0, 1.0));
  float lon = atan(wx, wz);

  // Grade de pontos.
  float dl = PI / linhas;
  float fila = floor((lat + PI * 0.5) / dl);
  float latc = (fila + 0.5) * dl - PI * 0.5;
  float n = max(1.0, floor(2.0 * linhas * cos(latc)));
  float dlon = 2.0 * PI / n;
  float col = floor((lon + PI) / dlon);
  float lonc = (col + 0.5) * dlon - PI;
  float dx = (lon - lonc) * cos(lat);
  float dy = lat - latc;
  float dist = sqrt(dx * dx + dy * dy);
  float tam = dl * 0.3;
  // Tamanho de um pixel na superfície: cresce perto da borda, onde a esfera fica de lado.
  float pe = px / max(z, 0.12);
  float ponto = 1.0 - smoothstep(tam - pe * 0.6, tam + pe * 0.6, dist);
  // Pontos menores que um pixel perdem brilho em vez de piscar.
  ponto *= clamp(tam / pe, 0.0, 1.0);

  float2 uv = float2((lonc + PI) / (2.0 * PI) * ${MASCARA.w.toFixed(1)}, (PI * 0.5 - latc) / PI * ${MASCARA.h.toFixed(1)});
  float terra = step(0.5, float(mascara.eval(uv).r));

  half3 mar = mix(corMarBorda.rgb, corMarCentro.rgb, half(pow(z, 0.8)));
  float luz = 0.3 + 0.7 * z;
  half3 cor = mix(mar, corTerra.rgb, half(ponto * terra * luz * float(corTerra.a)));

  // Borda do disco suavizada (sem serrilhado).
  float borda = 1.0 - smoothstep(1.0 - px * 1.5, 1.0, r);
  return half4(cor * half(borda), half(borda));
}
`;
