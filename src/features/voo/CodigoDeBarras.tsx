/** Código de barras decorativo do cartão de embarque, gerado do indicativo do voo (sempre igual para o mesmo voo). */
import { memo } from 'react';
import Svg, { Rect } from 'react-native-svg';

import { color } from '@/ds';

function semente(texto: string) {
  let h = 2166136261;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export const CodigoDeBarras = memo(function CodigoDeBarras({ texto, largura }: { texto: string; largura: number }) {
  const altura = (largura * 92) / 628; // proporção do Figma
  const r = semente(texto);
  const barras: { x: number; w: number }[] = [];
  for (let x = 0; x < largura; ) {
    const w = 1 + Math.floor(r() * 3);
    barras.push({ x, w });
    x += w + 1 + Math.floor(r() * 3);
  }
  return (
    <Svg width={largura} height={altura} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {barras.map((b) => (
        <Rect key={b.x} x={b.x} y={0} width={b.w} height={altura} fill={color.cartao.texto} />
      ))}
    </Svg>
  );
});
