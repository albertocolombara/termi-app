/**
 * Babel do app.
 *
 * O babel-preset-expo traz o plugin de worklets do Reanimated 4 para todo o código. O
 * react-native-filament (vitrine 3D das medalhas, ADR-12) roda as funções 'worklet' dele no
 * react-native-worklets-core, que espera o formato do plugin do próprio worklets-core. Com o plugin
 * do Reanimated, a vitrine fechava o app (build-71). Por isso só os arquivos do Filament (e do
 * worklets-core) usam o plugin do worklets-core, sem o do Reanimated; o resto do app não muda.
 */
const SO_FILAMENT = /node_modules[\\/](react-native-filament|react-native-worklets-core)[\\/]/;

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    overrides: [
      {
        // Função (e não RegExp direto): o Expo monta a configuração uma vez sem nome de arquivo.
        test: (arquivo) => !!arquivo && SO_FILAMENT.test(arquivo),
        presets: [['babel-preset-expo', { worklets: false, reanimated: false }]],
        plugins: [['react-native-worklets-core/plugin']],
      },
    ],
  };
};
