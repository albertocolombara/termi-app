/**
 * Dial de tempo de foco (Figma: "Dial de tempo / com voos", 358 × 358).
 * Girar o dedo no anel escolhe o tempo de 5 em 5 min; tocar no centro abre o seletor numérico.
 * Na econômica, a faixa acima de 3 h aparece em dourado (primeira classe) e não abre paywall (RN-20).
 */
import { useMemo } from 'react';
import { View, type AccessibilityActionEvent } from 'react-native';
import { GestureDetector, useExclusiveGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import type { Classe } from '@/domain/sessao/duracao';
import { DURACAO_MAXIMA_ECONOMICA_MIN, DURACAO_MAXIMA_PRIMEIRA_MIN, DURACAO_MINIMA_MIN } from '@/domain/sessao/duracao';
import { anguloDoTempo, PASSO_DIAL_MIN, rotuloDoTempo, tempoDoAngulo, type BarraDoDial } from '@/domain/voos/dial';
import { color, FirstClassSeal, gold, space, Suitcase, Text } from '@/ds';
import { t } from '@/i18n';

const TAM = 358;
const C = TAM / 2;
const R_BARRA = 136; // início das barras
const BARRA_MIN = 7;
const BARRA_MAX = 33;
const R_TRILHO = 121.1;
const ESPESSURA = 11.85;
const R_MIOLO = 105.3;
const R_BOTAO = 14.5;

const rad = (g: number) => (g * Math.PI) / 180;
const ponto = (r: number, g: number) => ({ x: C + r * Math.sin(rad(g)), y: C - r * Math.cos(rad(g)) });

function arco(r: number, fim: number) {
  if (fim <= 0.01) return '';
  const a = ponto(r, 0);
  const b = ponto(r, Math.min(fim, 359.99));
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${fim > 180 ? 1 : 0} 1 ${b.x} ${b.y}`;
}

export type DialDeTempoProps = {
  minutos: number;
  barras: BarraDoDial[];
  classe: Classe;
  onChange: (minutos: number) => void;
  onToqueNoCentro: () => void;
};

export function DialDeTempo({ minutos, barras, classe, onChange, onToqueNoCentro }: DialDeTempoProps) {
  const maxVoos = Math.max(1, ...barras.map((b) => b.voos));
  const premium = classe === 'economica' && minutos > DURACAO_MAXIMA_ECONOMICA_MIN;
  const angulo = anguloDoTempo(minutos);
  const botao = ponto(R_TRILHO, angulo);

  const tracos = useMemo(
    () =>
      barras.map((b) => {
        const g = anguloDoTempo(b.minutos);
        const comprimento = b.voos === 0 ? 2 : BARRA_MIN + (BARRA_MAX - BARRA_MIN) * Math.sqrt(b.voos / maxVoos);
        const ini = ponto(R_BARRA, g);
        const fim = ponto(R_BARRA + comprimento, g);
        const daPrimeira = classe === 'economica' && b.minutos > DURACAO_MAXIMA_ECONOMICA_MIN;
        const cor = b.naJanela
          ? color.accent.default
          : b.voos === 0
            ? color.dial.barraSemVoo
            : daPrimeira
              ? gold.stops[3].color
              : color.dial.barra;
        return { key: b.minutos, ini, fim, cor, opacidade: daPrimeira && !b.naJanela ? 0.7 : 1 };
      }),
    [barras, maxVoos, classe],
  );

  const escolher = (x: number, y: number) => {
    const g = (Math.atan2(x - C, C - y) * 180) / Math.PI;
    const novo = tempoDoAngulo(g, minutos);
    if (novo !== minutos) onChange(novo);
  };

  const giro = usePanGesture({
    runOnJS: true,
    minDistance: 4,
    onActivate: (e) => escolher(e.x, e.y),
    onUpdate: (e) => escolher(e.x, e.y),
  });
  const toque = useTapGesture({
    runOnJS: true,
    onActivate: (e) => {
      if (Math.hypot(e.x - C, e.y - C) < R_MIOLO) onToqueNoCentro();
      else escolher(e.x, e.y);
    },
  });
  const gestos = useExclusiveGestures(giro, toque);

  const passo = (e: AccessibilityActionEvent) => {
    const d = e.nativeEvent.actionName === 'increment' ? PASSO_DIAL_MIN : -PASSO_DIAL_MIN;
    onChange(Math.min(DURACAO_MAXIMA_PRIMEIRA_MIN, Math.max(DURACAO_MINIMA_MIN, minutos + d)));
  };

  return (
    <GestureDetector gesture={gestos}>
      <View
        style={{ width: TAM, height: TAM }}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={t('dial.rotuloAcessivel')}
        accessibilityValue={{ text: rotuloDoTempo(minutos) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }, { name: 'activate' }]}
        onAccessibilityAction={(e) => (e.nativeEvent.actionName === 'activate' ? onToqueNoCentro() : passo(e))}
      >
        <Svg width={TAM} height={TAM}>
          {tracos.map((tr) => (
            <Line
              key={tr.key}
              x1={tr.ini.x}
              y1={tr.ini.y}
              x2={tr.fim.x}
              y2={tr.fim.y}
              stroke={tr.cor}
              strokeOpacity={tr.opacidade}
              strokeWidth={4.21}
              strokeLinecap="round"
            />
          ))}
          <Circle cx={C} cy={C} r={R_MIOLO} fill={color.dial.miolo} />
          <Circle cx={C} cy={C} r={R_TRILHO} stroke={color.dial.trilho} strokeWidth={ESPESSURA} fill="none" />
          <Path d={arco(R_TRILHO, angulo)} stroke={color.accent.default} strokeWidth={ESPESSURA} strokeLinecap="round" fill="none" />
          <Circle cx={botao.x} cy={botao.y} r={R_BOTAO} fill={color.accent.default} stroke={color.dial.contornoDoBotao} strokeWidth={5.26} />
        </Svg>
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: C - 100, top: C - 100, width: 200, height: 200, alignItems: 'center', justifyContent: 'center', gap: space[12] }}
        >
          <Suitcase size={64} />
          <Text variant="Display/Pixel 32" style={{ fontSize: 48, lineHeight: 48, letterSpacing: -2.88 }}>
            {rotuloDoTempo(minutos)}
          </Text>
          {premium ? (
            <FirstClassSeal variant="menor" />
          ) : (
            <Text variant="Body/Large 16" style={{ color: color.text.muted, textAlign: 'center', paddingHorizontal: space[16] }}>
              {t('dial.dica')}
            </Text>
          )}
        </View>
      </View>
    </GestureDetector>
  );
}

/** Legenda abaixo do dial. */
export function LegendaDoDial() {
  const item = (cor: string, texto: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[6] }}>
      <View style={{ width: 10, height: 3, borderRadius: 2, backgroundColor: cor }} />
      <Text variant="Caption/Regular 12" style={{ color: color.dial.legenda, letterSpacing: 0 }}>
        {texto}
      </Text>
    </View>
  );
  return (
    <View style={{ flexDirection: 'row', gap: space[16] }}>
      {item(color.dial.barra, t('dial.legendaVoos'))}
      {item(color.accent.default, t('dial.legendaSeuTempo'))}
    </View>
  );
}
