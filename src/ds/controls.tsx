/** Controles de seleção e entrada (Figma: seção 07 · Seleção e entrada). */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Animated, { interpolate, interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Icon, type IconName } from './Icon';
import { motion, timing, useStateProgress } from './motion';
import { Text } from './Text';
import { color as C, hitSlop, radius, space, typography } from './tokens';

// ───────── Chip ─────────
export type ChipProps = {
  label: string;
  selected?: boolean;
  /** large = 36 px (filtros de região); small = 32 px (categorias em sheet). */
  size?: 'large' | 'small';
  onPress?: () => void;
};

/** Filtro/categoria de seleção única. Fundo e texto mudam juntos em 200 ms (MD3). */
export function Chip({ label, selected, size = 'large', onPress }: ChipProps) {
  const p = useStateProgress(!!selected);
  const fundo = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 1], [C.surface.default, C.accent.default]),
  }));
  const texto = useAnimatedStyle(() => ({
    color: interpolateColor(p.value, [0, 1], [C.text.secondary, C.text.onAccent]),
  }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chipHit, pressed && { opacity: 0.8 }]}
    >
      <Animated.View style={[styles.chip, size === 'large' ? styles.chipLarge : styles.chipSmall, fundo]}>
        <Animated.Text style={[typography[selected ? 'Label/Strong 14' : 'Label/Medium 14'], texto]}>{label}</Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

// ───────── Segmented control ─────────
export type Segment<T extends string> = { value: T; label: string; icon?: IconName };

/**
 * Alterna entre vistas (ex.: Janela / Globo). Superfície translúcida para ficar sobre a vista do voo.
 * O indicador do segmento ativo desliza até o segmento tocado (200 ms, MD3).
 */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
}: {
  segments: Segment<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  const [layouts, setLayouts] = useState<Record<string, { x: number; width: number }>>({});
  const ativo = layouts[value];
  const x = useSharedValue(0);
  const w = useSharedValue(0);
  const primeiraVez = useRef(true);

  useEffect(() => {
    if (!ativo) return;
    if (primeiraVez.current) {
      // Posição inicial sem animação.
      x.value = ativo.x;
      w.value = ativo.width;
      primeiraVez.current = false;
      return;
    }
    x.value = withTiming(ativo.x, timing());
    w.value = withTiming(ativo.width, timing());
  }, [ativo, x, w]);

  const indicador = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }], width: w.value }));

  return (
    <View style={styles.segmented} accessibilityRole="tablist">
      {ativo ? <Animated.View pointerEvents="none" style={[styles.segmentIndicator, indicador]} /> : null}
      {segments.map((s) => (
        <SegmentItem
          key={s.value}
          segment={s}
          active={s.value === value}
          onPress={() => onChange(s.value)}
          onLayout={(e: LayoutChangeEvent) => {
            const { x: lx, width } = e.nativeEvent.layout;
            setLayouts((l) => (l[s.value]?.x === lx && l[s.value]?.width === width ? l : { ...l, [s.value]: { x: lx, width } }));
          }}
        />
      ))}
    </View>
  );
}

function SegmentItem<T extends string>({
  segment,
  active,
  onPress,
  onLayout,
}: {
  segment: Segment<T>;
  active: boolean;
  onPress: () => void;
  onLayout: (e: LayoutChangeEvent) => void;
}) {
  const p = useStateProgress(active);
  const texto = useAnimatedStyle(() => ({
    color: interpolateColor(p.value, [0, 1], [C.text.secondary, C.text.primary]),
  }));
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      onLayout={onLayout}
      style={styles.segment}
    >
      {segment.icon ? <Icon name={segment.icon} size={16} color={active ? C.accent.default : C.text.secondary} /> : null}
      <Animated.Text style={[typography['Body/Medium 14'], texto]}>{segment.label}</Animated.Text>
    </Pressable>
  );
}

// ───────── Radio ─────────
/** O anel engrossa do contorno até o centro ao selecionar (200 ms, MD3). */
export function Radio({ selected }: { selected?: boolean }) {
  const p = useStateProgress(!!selected);
  const anel = useAnimatedStyle(() => ({
    borderWidth: interpolate(p.value, [0, 1], [2, 7]),
    borderColor: interpolateColor(p.value, [0, 1], [C.border.control, C.border.accent]),
  }));
  return <Animated.View style={[styles.radio, anel]} />;
}

// ───────── Checkbox ─────────
/** Preenche e mostra o check crescendo do centro (200 ms, MD3). */
export function Checkbox({ checked }: { checked?: boolean }) {
  const p = useStateProgress(!!checked);
  const fundo = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 1], ['transparent', C.accent.default]),
  }));
  const check = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scale: interpolate(p.value, [0, 1], [0.6, 1]) }] }));
  return (
    <Animated.View style={[styles.checkbox, fundo]}>
      <Animated.View style={check}>
        <Svg width={18} height={18} viewBox="0 0 18 18">
          <Path d="M4 9.5 7.5 13 14 5.5" stroke={C.accent.on} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

/** Tarefa da "bagagem de mão": checkbox + rótulo, toque alterna. */
export function CheckboxItem({ label, checked, onChange }: { label: string; checked?: boolean; onChange?: (v: boolean) => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: !!checked }}
      hitSlop={hitSlop}
      onPress={() => onChange?.(!checked)}
      style={styles.checkItem}
    >
      <Checkbox checked={checked} />
      <Text variant="Body/Large 16" style={checked && styles.done}>
        {label}
      </Text>
    </Pressable>
  );
}

// ───────── Toggle ─────────
const TOGGLE_CURSO = 48 - 3 * 2 - 22; // largura − padding − bolinha

/** A bolinha desliza e o trilho muda de cor juntos (300 ms, MD3). */
export function Toggle({ value, onChange }: { value: boolean; onChange?: (v: boolean) => void }) {
  const p = useStateProgress(value, motion.duration.medium2);
  const trilho = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 1], [C.surface.track, C.accent.default]),
  }));
  const bolinha = useAnimatedStyle(() => ({
    transform: [{ translateX: p.value * TOGGLE_CURSO }],
    backgroundColor: interpolateColor(p.value, [0, 1], [C.surface.inverse, C.accent.on]),
  }));
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      hitSlop={hitSlop}
      onPress={() => onChange?.(!value)}
    >
      <Animated.View style={[styles.toggle, trilho]}>
        <Animated.View style={[styles.knob, bolinha]} />
      </Animated.View>
    </Pressable>
  );
}

/** Configuração com título, descrição e interruptor. */
export function ToggleRow({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description?: string;
  value: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.texts}>
        <Text variant="Body/Large Medium 16">{title}</Text>
        {description ? (
          <Text variant="Body/Small 13" tone="muted">
            {description}
          </Text>
        ) : null}
      </View>
      <Toggle value={value} onChange={onChange} />
    </View>
  );
}

// ───────── Slider ─────────
export type SliderProps = {
  label?: string;
  /** 0 a 1. */
  value: number;
  onChange?: (v: number) => void;
  format?: (v: number) => string;
  /** Cor da borda do controle; deve ser a cor do fundo onde o slider está (padrão: bg/sheet). */
  surface?: string;
  style?: StyleProp<ViewStyle>;
};

const KNOB = 22;

export function Slider({ label, value, onChange, format = (v) => `${Math.round(v * 100)}%`, surface = C.bg.sheet, style }: SliderProps) {
  const [width, setWidth] = useState(0);

  // Recriado quando a largura ou o callback mudam; o sistema de toque usa sempre os handlers atuais.
  const pan = useMemo(() => {
    const emit = (x: number) => {
      if (width) onChange?.(Math.min(1, Math.max(0, x / width)));
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => emit(e.nativeEvent.locationX),
      onPanResponderMove: (e) => emit(e.nativeEvent.locationX),
    });
  }, [width, onChange]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const v = Math.min(1, Math.max(0, value));

  return (
    <View style={[styles.slider, style]}>
      {label ? (
        <View style={styles.sliderLabel}>
          <Text variant="Label/Medium 14" tone="tertiary">
            {label}
          </Text>
          <Text variant="Label/Medium 14" tone="tertiary">
            {format(v)}
          </Text>
        </View>
      ) : null}
      <View
        onLayout={onLayout}
        style={styles.sliderHit}
        accessibilityRole="adjustable"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }}
        {...pan.panHandlers}
      >
        <View pointerEvents="none" style={styles.track}>
          <View style={[styles.fill, { width: width * v }]} />
        </View>
        <View
          pointerEvents="none"
          style={[styles.thumb, { borderColor: surface, left: Math.max(0, Math.min(width - KNOB, width * v - KNOB / 2)) }]}
        />
      </View>
    </View>
  );
}

// ───────── Text field ─────────
export function TextField({ style, ...rest }: TextInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      placeholderTextColor={C.text.tertiary}
      selectionColor={C.accent.default}
      cursorColor={C.accent.default}
      // Sem isso o Android desenha uma linha embaixo de todo campo de texto.
      underlineColorAndroid="transparent"
      {...rest}
      onFocus={(e) => {
        setFocused(true);
        rest.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        rest.onBlur?.(e);
      }}
      style={[styles.field, focused && { borderColor: C.border.accent }, style]}
    />
  );
}

const styles = StyleSheet.create({
  chipHit: { alignSelf: 'flex-start' },
  chip: { borderRadius: radius.sm },
  chipLarge: { paddingVertical: 9, paddingHorizontal: space[14] },
  chipSmall: { paddingVertical: 7, paddingHorizontal: space[12] },
  segmented: { flexDirection: 'row', alignSelf: 'flex-start', backgroundColor: C.surface.strong, borderRadius: radius.md },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[6],
    paddingVertical: space[4],
    paddingHorizontal: space[16],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: C.surface.sunken,
    borderColor: C.border.subtle,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  radio: { width: 22, height: 22, borderRadius: 11 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: C.border.accent,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: space[10], alignSelf: 'flex-start' },
  done: { color: C.text.tertiary, textDecorationLine: 'line-through' },
  toggle: { width: 48, height: 28, borderRadius: radius.full, padding: 3, flexDirection: 'row', alignItems: 'center' },
  knob: { width: 22, height: 22, borderRadius: 11 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: space[16] },
  texts: { flex: 1, gap: space[2] },
  slider: { gap: space[10] },
  sliderLabel: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderHit: { height: KNOB, justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, backgroundColor: C.surface.track, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: C.accent.default },
  thumb: {
    position: 'absolute',
    top: 0,
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    borderWidth: 3,
    backgroundColor: C.accent.default,
  },
  field: {
    ...typography['Body/Large 16'],
    color: C.text.primary,
    borderWidth: 1,
    borderColor: C.border.input,
    borderRadius: radius.md,
    padding: space[12],
  },
});
