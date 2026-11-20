const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Pacotes de blocos Landsat (vários WebP concatenados) vão como arquivos brutos.
config.resolver.assetExts.push('bin');
// Animações do Termi exportadas do Rive.
config.resolver.assetExts.push('riv');

module.exports = config;
