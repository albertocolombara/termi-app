/**
 * Letreiro de painel de aeroporto (split-flap): ao aparecer ou trocar de texto, cada letra gira por
 * caracteres aleatórios e para na certa, da esquerda para a direita (pedido do Alberto, 20/11/2026).
 * Um relógio só (~22 quadros por segundo) serve todos os letreiros da tela.
 * Com "reduzir movimento", o texto troca direto. Leitores de tela leem só o texto final.
 */
import { useEffect, useRef, useState } from 'react';
import { type StyleProp, type TextStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { Text } from './Text';

const CARACTERES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const QUADRO_MS = 45;
/** Quadros girando antes da primeira letra parar e entre uma letra e a seguinte. */
const GIROS_INICIAIS = 4;
const ESPACO_ENTRE_LETRAS = 1;

// ── Relógio compartilhado ──
const ouvintes = new Set<() => void>();
let relogio: ReturnType<typeof setInterval> | null = null;
function assinar(f: () => void) {
  ouvintes.add(f);
  relogio ??= setInterval(() => ouvintes.forEach((o) => o()), QUADRO_MS);
  return () => {
    ouvintes.delete(f);
    if (ouvintes.size === 0 && relogio) {
      clearInterval(relogio);
      relogio = null;
    }
  };
}

const aleatorio = () => CARACTERES[Math.floor(Math.random() * CARACTERES.length)];

function quadroDo(texto: string, quadro: number): string {
  let s = '';
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    s += c === ' ' || quadro >= GIROS_INICIAIS + i * ESPACO_ENTRE_LETRAS ? c : c === c.toLowerCase() ? aleatorio().toLowerCase() : aleatorio();
  }
  return s;
}

export function Letreiro({ texto, style, numberOfLines = 1 }: { texto: string; style?: StyleProp<TextStyle>; numberOfLines?: number }) {
  const reduzir = useReducedMotion();
  const [exibido, setExibido] = useState(reduzir ? texto : quadroDo(texto, 0));
  const quadro = useRef(0);

  useEffect(() => {
    if (reduzir) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExibido(texto);
      return;
    }
    quadro.current = 0;
    const fim = GIROS_INICIAIS + texto.length * ESPACO_ENTRE_LETRAS;
    let cancelar: (() => void) | null = null;
    cancelar = assinar(() => {
      quadro.current += 1;
      setExibido(quadroDo(texto, quadro.current));
      if (quadro.current >= fim) cancelar?.();
    });
    return () => cancelar?.();
  }, [texto, reduzir]);

  return (
    <Text style={style} numberOfLines={numberOfLines} accessibilityLabel={texto}>
      {exibido}
    </Text>
  );
}

/** Alterna entre valores a cada `intervaloMs`, todos os letreiros juntos (mesmo relógio de parede). */
export function useAlternancia(intervaloMs: number, quantos: number): number {
  const [i, setI] = useState(() => Math.floor(Date.now() / intervaloMs) % quantos);
  useEffect(() => {
    const id = setInterval(() => setI(Math.floor(Date.now() / intervaloMs) % quantos), 500);
    return () => clearInterval(id);
  }, [intervaloMs, quantos]);
  return i;
}
