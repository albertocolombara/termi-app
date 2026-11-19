// Baixa os pacotes de blocos Landsat/GMIS do protótipo (rota Barcelona → Londres) para a
// tela de teste da janela. São só para desenvolvimento: no app final, os blocos da rota
// são baixados do Cloudflare R2 no embarque (ROADMAP, Fase 2). Os .bin não vão para o git.
//
// Uso: npm run blocos:dev            (baixa tudo de novo)
//      node scripts/baixar-blocos-dev.mjs --se-faltar   (postinstall: só o que falta; nunca falha)

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Commit do protótipo com os blocos validados no aparelho (build-8).
const COMMIT = '9e5e5741712595b70d95b40a6b3617878c8364c9';
const BASE = `https://raw.githubusercontent.com/albertocolombara/termi-prototipo/${COMMIT}/assets/janela/`;

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const dirJanela = join(raiz, 'assets', 'janela');
const soSeFaltar = process.argv.includes('--se-faltar');

// Na checagem do CI (tipos, lint, testes) os blocos não são necessários.
if (soSeFaltar && process.env.SEM_BLOCOS === '1') {
  console.log('Blocos de teste da janela: pulado (SEM_BLOCOS=1).');
  process.exit(0);
}

const index = JSON.parse(readFileSync(join(dirJanela, 'pk', 'index.json'), 'utf8'));
const pacotes = [...new Set(Object.values(index).map(([arquivo]) => arquivo))].sort();

let baixados = 0;
try {
  for (const arquivo of pacotes) {
    const destino = join(dirJanela, arquivo);
    if (soSeFaltar && existsSync(destino)) continue;
    const resp = await fetch(BASE + arquivo);
    if (!resp.ok) throw new Error(`${arquivo}: HTTP ${resp.status}`);
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, Buffer.from(await resp.arrayBuffer()));
    baixados++;
  }
  console.log(`Blocos de teste da janela: ${baixados} baixado(s), ${pacotes.length} no total.`);
} catch (e) {
  const msg = `Não foi possível baixar os blocos de teste da janela (${e.message}).`;
  if (soSeFaltar) {
    console.warn(`${msg} Rode "npm run blocos:dev" antes de gerar o app.`);
  } else {
    console.error(msg);
    process.exit(1);
  }
}
