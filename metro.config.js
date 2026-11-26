const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Pacotes de blocos Landsat (vários WebP concatenados) vão como arquivos brutos.
config.resolver.assetExts.push('bin');
// Animações do Termi exportadas do Rive.
config.resolver.assetExts.push('riv');

// O react-native-filament 1.11 usa o InteractionManager, que o React Native 0.88 removeu. Troca só
// esse arquivo dele por uma versão nossa (src/vendor/filament), sem mexer em node_modules.
const SUBSTITUTOS = {
  [path.join('react-native-filament', 'src', 'utilities', 'withCleanupScope.ts')]: path.join(
    __dirname,
    'src',
    'vendor',
    'filament',
    'withCleanupScope.ts',
  ),
};
const resolverPadrao = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const r = (resolverPadrao ?? context.resolveRequest)(context, moduleName, platform);
  if (r && r.type === 'sourceFile') {
    for (const [fim, novo] of Object.entries(SUBSTITUTOS)) {
      if (r.filePath.endsWith(fim)) return { type: 'sourceFile', filePath: novo };
    }
  }
  return r;
};

module.exports = config;
