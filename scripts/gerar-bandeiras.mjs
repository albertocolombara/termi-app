// Gera src/ds/bandeiras/svg.ts a partir das bandeiras do Flagpack (MIT, flagpack-core, tamanho "m" 20x15).
// As bandeiras ficam no app (sem rede) e minificadas com o SVGO (~330 KB no total).
// Uso: node scripts/gerar-bandeiras.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { optimize } from 'svgo';

const require = createRequire(import.meta.url);
const dir = path.join(path.dirname(require.resolve('flagpack-core/package.json')), 'svg', 'm');
const saida = {};
for (const f of fs.readdirSync(dir).sort()) {
  if (!f.endsWith('.svg')) continue;
  let codigo = f.replace('.svg', '');
  if (codigo === 'GB-UKM') codigo = 'GB'; // Reino Unido
  if (codigo.includes('-')) continue; // Inglaterra, Escócia etc. não são países de companhia
  const prefixo = `f${codigo}_`; // ids únicos por bandeira
  const svg = optimize(fs.readFileSync(path.join(dir, f), 'utf8'), {
    multipass: true,
    floatPrecision: 1,
    plugins: [{ name: 'preset-default', params: { overrides: { removeViewBox: false } } }, { name: 'prefixIds', params: { prefix: prefixo, delim: '' } }],
  }).data;
  saida[codigo] = svg;
}
const corpo =
  '// Gerado por scripts/gerar-bandeiras.mjs. Não edite à mão.\n' +
  '// Bandeiras: Flagpack (https://flagpack.xyz), licença MIT, © Yummygum.\n' +
  `export const BANDEIRAS: Record<string, string> = ${JSON.stringify(saida)};\n`;
fs.writeFileSync('src/ds/bandeiras/svg.ts', corpo);
console.log(`${Object.keys(saida).length} bandeiras, ${(corpo.length / 1024).toFixed(0)} KB`);
