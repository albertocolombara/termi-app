/**
 * Gera a máscara de terra do globo de rotas (Início e Estatísticas):
 * `assets/globo/terra-mascara.png`, equirretangular 1024×512, terra branca sobre o mar preto.
 *
 * O shader do globo pontilhado lê essa máscara para decidir onde há um ponto de terra.
 * Fonte: Natural Earth 1:50m (domínio público), pelo pacote world-atlas.
 *
 * Uso: node scripts/gerar-mascara-da-terra.mjs
 * Só precisa rodar de novo se a resolução ou a fonte mudarem; o PNG fica no repositório.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { feature } from 'topojson-client';
import { Resvg } from '@resvg/resvg-js';

const require = createRequire(import.meta.url);
const LARGURA = 1024;
const ALTURA = 512;

const topo = JSON.parse(readFileSync(require.resolve('world-atlas/land-50m.json'), 'utf8'));
const terra = feature(topo, topo.objects.land);

const x = (lon) => ((lon + 180) / 360) * LARGURA;
const y = (lat) => ((90 - lat) / 180) * ALTURA;

/**
 * Anel em caminho SVG. Alguns anéis cruzam a linha de data (Rússia, Fiji): as longitudes são
 * "desenroladas" para o anel continuar contínuo, e o anel é desenhado três vezes (−360°, 0, +360°);
 * o que passa da borda da imagem é cortado.
 */
function anel(coords, deslocamento) {
  let anterior = coords[0][0];
  let soma = 0;
  return (
    coords
      .map(([lon, lat], i) => {
        if (i) {
          const d = lon - anterior;
          if (d > 180) soma -= 360;
          else if (d < -180) soma += 360;
        }
        anterior = lon;
        return `${i ? 'L' : 'M'}${x(lon + soma + deslocamento).toFixed(2)} ${y(lat).toFixed(2)}`;
      })
      .join('') + 'Z'
  );
}

const caminhos = [];
for (const f of terra.features) {
  const g = f.geometry;
  const poligonos = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  for (const p of poligonos) for (const d of [-360, 0, 360]) caminhos.push(p.map((a) => anel(a, d)).join(''));
}

// A Antártida (abaixo de −60°) fica de fora: o globo não mostra rotas lá e ela pesaria no topo da vista.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${LARGURA}" height="${ALTURA}" viewBox="0 0 ${LARGURA} ${ALTURA}">
<rect width="100%" height="100%" fill="#000"/>
<path d="${caminhos.join('')}" fill="#fff" fill-rule="nonzero"/>
<rect x="0" y="${y(-60)}" width="${LARGURA}" height="${ALTURA - y(-60)}" fill="#000"/>
</svg>`;

const png = new Resvg(svg, { fitTo: { mode: 'original' } }).render().asPng();
writeFileSync(new URL('../assets/globo/terra-mascara.png', import.meta.url), png);
console.log(`terra-mascara.png: ${LARGURA}×${ALTURA}, ${(png.length / 1024).toFixed(1)} KB`);
