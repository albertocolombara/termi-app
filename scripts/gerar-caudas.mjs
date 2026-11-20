// Gera as caudas pintadas com as bandeiras como PNG (assets/caudas/{PAÍS}.png, 108 × 108 = 36 dp a 3x)
// e o mapa src/ds/bandeiras/caudas.ts. Bandeiras: Flagpack (MIT, flagpack-core, tamanho "m" 20x15).
//
// Por que PNG: desenhar o SVG de cada bandeira na lista de partidas (SvgXml) pesava e derrubava o app
// no Android ao rolar a lista (build-17). Algumas bandeiras usam máscaras e filtros que o
// react-native-svg não suporta bem. Uma imagem pronta é leve e sempre igual.
//
// Uso: node scripts/gerar-caudas.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { Resvg } from '@resvg/resvg-js';

const require = createRequire(import.meta.url);
const dir = path.join(path.dirname(require.resolve('flagpack-core/package.json')), 'svg', 'm');
const SAIDA = 'assets/caudas';
const LADO = 108;

const CAUDA = 'M0 27.27L19.12 1.78C19.95.63 21.21 0 22.57 0h7.62c1.15 0 1.99 1.04 1.78 2.19L28.15 27.27H0Z';
const LEME = 'M27.76 31.64L31.99 5.31';
const BORDA = 'M21.12 6.15C21.96 5 23.21 4.37 24.57 4.37h7.62';

function partes(svg) {
  const vb = /viewBox="([^"]+)"/.exec(svg)?.[1] ?? '0 0 20 15';
  const inicio = svg.indexOf('>') + 1;
  return { vb, corpo: svg.slice(inicio, svg.lastIndexOf('</svg>')) };
}

function caudaSvg(bandeira) {
  const pintura = bandeira
    ? (() => {
        const { vb, corpo } = partes(bandeira);
        return `<svg x="-1.1" y="2.12" width="42.35" height="31.76" viewBox="${vb}" preserveAspectRatio="none">${corpo}</svg>`;
      })()
    : `<rect x="0" y="0" width="36" height="36" fill="#5B5F68"/>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">` +
    `<defs><clipPath id="cauda"><path transform="translate(2 4.37)" d="${CAUDA}"/></clipPath></defs>` +
    `<g clip-path="url(#cauda)">${pintura}</g>` +
    `<path d="${LEME}" stroke="#000" stroke-opacity="0.22" stroke-width="0.84" fill="none"/>` +
    `<path d="${BORDA}" stroke="#000" stroke-opacity="0.22" stroke-width="0.84" fill="none"/>` +
    `</svg>`
  );
}

const png = (svg) => new Resvg(svg, { fitTo: { mode: 'width', value: LADO } }).render().asPng();

fs.rmSync(SAIDA, { recursive: true, force: true });
fs.mkdirSync(SAIDA, { recursive: true });
const codigos = [];
let bytes = 0;
for (const f of fs.readdirSync(dir).sort()) {
  if (!f.endsWith('.svg')) continue;
  let codigo = f.replace('.svg', '');
  if (codigo === 'GB-UKM') codigo = 'GB'; // Reino Unido
  if (codigo.includes('-')) continue; // Inglaterra, Escócia etc. não são países de companhia
  const b = png(caudaSvg(fs.readFileSync(path.join(dir, f), 'utf8')));
  fs.writeFileSync(path.join(SAIDA, `${codigo}.png`), b);
  bytes += b.length;
  codigos.push(codigo);
}
const neutra = png(caudaSvg(null));
fs.writeFileSync(path.join(SAIDA, '_neutra.png'), neutra);

const corpo =
  '// Gerado por scripts/gerar-caudas.mjs. Não edite à mão.\n' +
  '// Bandeiras: Flagpack (https://flagpack.xyz), licença MIT, © Yummygum.\n' +
  'export const CAUDAS: Record<string, number> = {\n' +
  codigos.map((c) => `  ${JSON.stringify(c)}: require('../../../assets/caudas/${c}.png'),`).join('\n') +
  '\n};\n' +
  "export const CAUDA_NEUTRA: number = require('../../../assets/caudas/_neutra.png');\n";
fs.writeFileSync('src/ds/bandeiras/caudas.ts', corpo);
console.log(`${codigos.length} caudas, ${(bytes / 1024).toFixed(0)} KB`);
