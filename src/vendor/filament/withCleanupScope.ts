/**
 * Substitui `react-native-filament/src/utilities/withCleanupScope.ts` (ver metro.config.js).
 *
 * O original usa `InteractionManager.runAfterInteractions`, que o React Native 0.88 removeu:
 * `InteractionManager` chega `undefined` e a vitrine 3D fechava o app (build-74, diagnóstico:
 * "Cannot read property 'runAfterInteractions' of undefined" em FilamentScene).
 * O RN recomenda `requestIdleCallback` no lugar. O comportamento é o mesmo: liberar a memória do
 * Filament só depois que as limpezas dos filhos rodaram.
 */
export function withCleanupScope(cleanupFunction: () => void) {
  return () => {
    const depois = () => setTimeout(() => cleanupFunction(), 0);
    if (typeof requestIdleCallback === 'function') requestIdleCallback(depois);
    else setTimeout(depois, 0);
  };
}
