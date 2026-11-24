/**
 * Worklet com parâmetro padrão que lê uma variável de fora fecha o app: no UI thread o padrão é
 * avaliado antes de a variável capturada existir (build-41, ao abrir o globo). Este teste passa
 * todos os arquivos pelo plugin de worklets e procura esse caso.
 */
// O projeto não tem os tipos do Node: fs, path e o Babel entram sem tipos (só no teste).
declare const __dirname: string;
const req: any = require;
const { readdirSync, statSync } = req('fs');
const { dirname, join } = req('path');
const babel = req('@babel/core');

function arquivos(pasta: string): string[] {
  return readdirSync(pasta).flatMap((n: string) => {
    const p = join(pasta, n);
    if (statSync(p).isDirectory()) return n === '__tests__' ? [] : arquivos(p);
    return /\.(ts|tsx)$/.test(n) && !n.endsWith('.d.ts') ? [p] : [];
  });
}

describe('worklets', () => {
  it('nenhum parâmetro padrão lê variável capturada', () => {
    const problemas: string[] = [];
    for (const f of arquivos(join(__dirname, '..'))) {
      const out = babel.transformFileSync(f, {
        babelrc: false,
        configFile: false,
        plugins: [req.resolve('react-native-worklets/plugin')],
        presets: [[req.resolve('@babel/preset-typescript', { paths: [join(dirname(req.resolve('expo/package.json')), 'node_modules')] }), { isTSX: true, allExtensions: true }]],
      });
      const re = /function (\w+)\(([^)]*)\)\{const\{?\[?([^=]*?)\]?\}?=this\.__closure/g;
      for (const m of out.code.matchAll(re)) {
        const vars = m[3].split(',').map((v: string) => v.trim()).filter(Boolean);
        for (const v of vars) if (new RegExp('=[^,]*\\b' + v + '\\b').test(m[2])) problemas.push(`${f}: ${m[1]} lê ${v}`);
      }
    }
    expect(problemas).toEqual([]);
  });
});
