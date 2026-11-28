/**
 * Dial de tempo de foco (Figma: "Dial de tempo / com voos", 358 × 358).
 * Girar o dedo no anel escolhe o tempo de 5 em 5 min; tocar no centro abre o seletor numérico.
 * Na econômica, a faixa acima de 3 h aparece em dourado (primeira classe) e não abre paywall (RN-20).
 *
 * `tamanho` encolhe o dial inteiro para caber na tela sem rolagem (Alberto, build-47). O desenho segue
 * nas medidas do Figma (358) e só a escala muda; o toque é convertido de volta para essas medidas.
 */
import { useMemo } from 'react';
import { View, type AccessibilityActionEvent } from 'react-native';
import { GestureDetector, useExclusiveGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import type { Classe } from '@/domain/sessao/duracao';
import { DURACAO_MAXIMA_ECONOMICA_MIN, DURACAO_MAXIMA_PRIMEIRA_MIN, DURACAO_MINIMA_MIN } from '@/domain/sessao/duracao';
import { anguloDoTempo, PASSO_DIAL_MIN, rotuloDoTempo, tempoDoAngulo, type BarraDoDial } from '@/domain/voos/dial';
import { color, gold, haptic, Plus, space, Text } from '@/ds';
import { TermiAnimado } from '@/features/termi/TermiAnimado';
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
/** O artboard do Termi tem 400 × 400 e o corpo ocupa ~37% da altura: 172 dá um Termi de ~64. */
const TERMI_RIVE = 172;
/** Quanto os olhos andam (unidades do artboard). */
const OLHAR_X = 14;
const OLHAR_Y = 9;

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
  /** Lado do dial em dp (padrão: 358, o do Figma). */
  tamanho?: number;
};

export const TAMANHO_DO_DIAL = TAM;

export function DialDeTempo({ minutos, barras, classe, onChange, onToqueNoCentro, tamanho = TAM }: DialDeTempoProps) {
  const k = tamanho / TAM;
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

  const escolher = (xNaTela: number, yNaTela: number) => {
    const x = xNaTela / k;
    const y = yNaTela / k;
    const g = (Math.atan2(x - C, C - y) * 180) / Math.PI;
    const novo = tempoDoAngulo(g, minutos);
    if (novo !== minutos) {
      haptic.selecao();
      onChange(novo);
    }
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
      if (Math.hypot(e.x / k - C, e.y / k - C) < R_MIOLO) onToqueNoCentro();
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
        style={{ width: tamanho, height: tamanho }}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={t('dial.rotuloAcessivel')}
        accessibilityValue={{ text: rotuloDoTempo(minutos) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }, { name: 'activate' }]}
        onAccessibilityAction={(e) => (e.nativeEvent.actionName === 'activate' ? onToqueNoCentro() : passo(e))}
      >
        <Svg width={tamanho} height={tamanho} viewBox={`0 0 ${TAM} ${TAM}`}>
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
        {/* Miolo nas medidas do Figma, escalado junto com o desenho. */}
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: (tamanho - TAM) / 2, top: (tamanho - TAM) / 2, width: TAM, height: TAM, transform: [{ scale: k }] }}
        >
          <View
            style={{ position: 'absolute', left: C - 100, top: C - 100, width: 200, height: 200, alignItems: 'center', justifyContent: 'center', gap: space[12] }}
          >
            {/* O Termi fica curioso: os olhos acompanham o botão do dial enquanto o dedo gira. */}
            <View style={{ width: 64, height: 64 }}>
              <TermiAnimado
                tamanho={TERMI_RIVE}
                olhar={{ x: Math.sin(rad(angulo)) * OLHAR_X, y: -Math.cos(rad(angulo)) * OLHAR_Y }}
                rotulo={t('dial.termi')}
                style={{ position: 'absolute', left: 32 - TERMI_RIVE * 0.47, top: 32 - TERMI_RIVE * 0.59 }}
              />
            </View>
            <Text variant="Display/Pixel 32" style={{ fontSize: 48, lineHeight: 48, letterSpacing: -2.88 }}>
              {rotuloDoTempo(minutos)}
            </Text>
            {premium ? (
              <Plus tamanho="pequeno" />
            ) : (
              <Text variant="Body/Medium 14" style={{ color: color.text.muted, textAlign: 'center', paddingHorizontal: space[16] }}>
                {t('dial.dica')}
              </Text>
            )}
          </View>
        </View>
      </View>
    </GestureDetector>
  );
}

/** Legenda abaixo do dial. */
export function LegendaDoDial() {
  const item = (cor: string, texto: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[4] }}>
      <View style={{ width: 8, height: 3, borderRadius: 2, backgroundColor: cor }} />
      {/* Um pouco menor que Caption 12, para sobrar espaço para o dial (Alberto, build-47). */}
      <Text variant="Caption/Regular 12" style={{ color: color.dial.legenda, letterSpacing: 0, fontSize: 11, lineHeight: 14 }}>
        {texto}
      </Text>
    </View>
  );
  return (
    <View style={{ flexDirection: 'row', gap: space[12] }}>
      {item(color.dial.barra, t('dial.legendaVoos'))}
      {item(color.accent.default, t('dial.legendaSeuTempo'))}
    </View>
  );
}
