/**
 * Cauda do avião pintada com a bandeira do país da companhia
 * (Figma: "Painel de voos/Identificação do voo", Ícone=Cauda, 36 × 36).
 * Nunca logo ou pintura real da companhia (CLAUDE.md §2.7). Bandeiras: Flagpack (MIT).
 */
import { memo } from 'react';
import { SvgXml } from 'react-native-svg';

import { BANDEIRAS } from './svg';

const CAUDA = 'M0 27.27L19.12 1.78C19.95.63 21.21 0 22.57 0h7.62c1.15 0 1.99 1.04 1.78 2.19L28.15 27.27H0Z';
const LEME = 'M27.76 31.64L31.99 5.31';
const BORDA = 'M21.12 6.15C21.96 5 23.21 4.37 24.57 4.37h7.62';

/** Conteúdo interno de um SVG (sem a tag <svg>) e o viewBox dele. */
function partes(svg: string) {
  const vb = /viewBox="([^"]+)"/.exec(svg)?.[1] ?? '0 0 20 15';
  const inicio = svg.indexOf('>') + 1;
  return { vb, corpo: svg.slice(inicio, svg.lastIndexOf('</svg>')) };
}

function xmlDaCauda(pais: string | null): string {
  const bandeira = pais ? BANDEIRAS[pais.toUpperCase()] : undefined;
  const pintura = bandeira
    ? (() => {
        const { vb, corpo } = partes(bandeira);
        return `<svg x="-1.1" y="2.12" width="42.35" height="31.76" viewBox="${vb}" preserveAspectRatio="none">${corpo}</svg>`;
      })()
    : `<rect x="0" y="0" width="36" height="36" fill="#5B5F68"/>`; // sem país conhecido: cauda neutra
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">` +
    `<defs><clipPath id="cauda"><path transform="translate(2 4.37)" d="${CAUDA}"/></clipPath></defs>` +
    `<g clip-path="url(#cauda)">${pintura}</g>` +
    `<path d="${LEME}" stroke="#000" stroke-opacity="0.22" stroke-width="0.84" fill="none"/>` +
    `<path d="${BORDA}" stroke="#000" stroke-opacity="0.22" stroke-width="0.84" fill="none"/>` +
    `</svg>`
  );
}

const cache = new Map<string, string>();

export const Cauda = memo(function Cauda({ pais, tamanho = 36 }: { pais: string | null; tamanho?: number }) {
  const chave = pais ?? '';
  if (!cache.has(chave)) cache.set(chave, xmlDaCauda(pais));
  return <SvgXml xml={cache.get(chave)!} width={tamanho} height={tamanho} />;
});
