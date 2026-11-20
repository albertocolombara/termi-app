/**
 * Cauda do avião pintada com a bandeira do país da companhia
 * (Figma: "Painel de voos/Identificação do voo", Ícone=Cauda, 36 × 36).
 * Nunca logo ou pintura real da companhia (CLAUDE.md §2.7). Bandeiras: Flagpack (MIT).
 *
 * PNG gerado por scripts/gerar-caudas.mjs. Desenhar o SVG de cada bandeira por linha derrubava o app
 * ao rolar a lista de partidas (build-17, 20/11/2026).
 */
import { memo } from 'react';
import { Image } from 'react-native';

import { CAUDA_NEUTRA, CAUDAS } from './caudas';

export const Cauda = memo(function Cauda({ pais, tamanho = 36 }: { pais: string | null; tamanho?: number }) {
  const fonte = (pais && CAUDAS[pais.toUpperCase()]) || CAUDA_NEUTRA;
  return <Image source={fonte} style={{ width: tamanho, height: tamanho }} fadeDuration={0} accessibilityIgnoresInvertColors />;
});
