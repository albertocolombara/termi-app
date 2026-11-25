const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Medalhas 3D (vitrine da mala, react-native-filament).
config.resolver.assetExts.push('glb');
// Animações do Termi exportadas do Rive.
config.resolver.assetExts.push('riv');

module.exports = config;
