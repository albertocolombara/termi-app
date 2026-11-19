// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'android/*', 'ios/*', 'node_modules/*', '.expo/*'],
  },
  {
    // Janela trazida do protótipo e medida no aparelho (ARCHITECTURE.md §18): o relógio da
    // paisagem e o medidor leem refs e Date.now() durante a renderização de propósito.
    // Revisar junto com a mudança da paisagem para a thread de interface (ROADMAP, Fase 3).
    files: ['src/janela/**'],
    rules: {
      'react-hooks/refs': 'off',
      'react-hooks/purity': 'off',
    },
  },
  {
    // Pacotes de blocos e renders são carregados por require() (assets do Metro).
    files: ['src/janela/**'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
]);
