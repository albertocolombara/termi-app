/** Conteúdo e ações compactas (Figma: seções 06 · Ações e 08 · Conteúdo). */
import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Icon, Suitcase, type IconName } from './Icon';
import { Radio } from './controls';
import { useStateProgress } from './motion';
import { Text } from './Text';
import { color as C, fontFamily, gold, radius, space } from './tokens';

// ───────── Superfícies douradas (selos de 1ª classe) ─────────
// Gradiente nativo do React Native (CSS `linear-gradient`), da esquerda para a direita como no Figma.
// Antes era um <Svg> por trás do selo, que no Android saía com tamanho errado e ignorava a transparência.
const gradiente = (stops: readonly { offset: number; color: string }[]) =>
  `linear-gradient(90deg, ${stops.map((s) => `${s.color} ${Math.round(s.offset * 100)}%`).join(', ')})`;

const GOLD_GRADIENT = gradiente(gold.stops);
const SEAL_GRADIENT = gradiente([
  { offset: 0, color: gold.seal.from },
  { offset: 1, color: gold.seal.to },
]);

/** Selo "1ª classe" para conteúdo premium bloqueado (Figma: Badge / Premium). */
export function PremiumBadge({ label = '1ª classe' }: { label?: string }) {
  return (
    <View style={styles.badge}>
      <Icon name="lock" color={gold.ink} />
      <Text variant="Caption/Strong 12" style={[styles.goldText, styles.badgeText]}>
        {label}
      </Text>
    </View>
  );
}

export type FirstClassSealVariant = 'default' | 'menor' | 'texto';

/**
 * Selo de assinante (Figma: Selo · Primeira classe).
 * `default`: ícone 24 e texto 12; `menor`: ícone 16 e texto 8; `texto`: só o texto.
 */
export function FirstClassSeal({
  label = 'Primeira classe',
  variant = 'default',
}: {
  label?: string;
  variant?: FirstClassSealVariant;
}) {
  const menor = variant === 'menor';
  return (
    <View style={[styles.seal, variant === 'texto' ? styles.sealTexto : menor ? styles.sealMenor : null]}>
      {variant !== 'texto' && <Icon name="termiPremiumQuadrado" size={menor ? 16 : 24} />}
      <Text variant="Caption/Strong 12" style={[styles.sealText, menor && styles.sealTextMenor]}>
        {label}
      </Text>
    </View>
  );
}

// ───────── Plus (Figma v3: componente "Plus") ─────────
/**
 * Marca do Plus (antes Termi Premium / Primeira classe): pílula amarela bem leve com "Plus" em
 * Geist Pixel Grid. Sem o mascote (decidido pelo Alberto no Figma v3, 24/11/2026).
 * `pequeno` é a versão das listas (sons, vistas), no lugar do antigo selo dourado.
 */
export function Plus({
  tamanho = 'padrao',
  rotulo = 'Plus',
  bloqueado,
}: {
  tamanho?: 'padrao' | 'pequeno';
  rotulo?: string;
  /** Variante "Bloqueado" do Figma: cadeado + Plus, no tamanho pequeno (ex.: cartões da loja remota na econômica). */
  bloqueado?: boolean;
}) {
  const pequeno = tamanho === 'pequeno' || bloqueado;
  return (
    <View style={[styles.plus, pequeno && styles.plusPequeno, bloqueado && styles.plusBloqueado]}>
      {bloqueado ? <Icon name="lock" size={12} /> : null}
      <Text variant="Label/Medium 14" style={[styles.plusTexto, pequeno && styles.plusTextoPequeno]}>
        {rotulo}
      </Text>
    </View>
  );
}

// ───────── Avatar ─────────
/**
 * Perfil do usuário (Figma: Avatar). `botao` fica no topo do Início e abre o menu lateral (indicador
 * amarelo com as três linhas); `grande` aparece no topo do menu.
 */
export function Avatar({ tamanho = 'botao' }: { tamanho?: 'botao' | 'grande' }) {
  if (tamanho === 'grande') {
    return (
      <Svg width={64} height={64} viewBox="0 0 64 64">
        <Circle cx={32} cy={32} r={31.25} fill={C.accent.subtle} stroke={C.border.accent} strokeWidth={1.5} />
        <Path d="M32 33.92a9.6 9.6 0 1 0 0-19.2 9.6 9.6 0 0 0 0 19.2Z" fill={C.accent.default} />
        <Path d="M15.36 48.64c0-8.32 7.68-12.8 16.64-12.8s16.64 4.48 16.64 12.8H15.36Z" fill={C.accent.default} />
      </Svg>
    );
  }
  return (
    <Svg width={48} height={48} viewBox="0 0 48 48">
      <Circle cx={24} cy={24} r={19.5} fill={C.surface.default} stroke={C.border.default} />
      <Path d="M24 25.2a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z" fill={C.text.secondary} />
      <Path d="M13.6 34.4c0-5.2 4.8-8 10.4-8s10.4 2.8 10.4 8H13.6Z" fill={C.text.secondary} />
      <Rect x={27} y={27} width={20} height={20} rx={10} fill={C.accent.default} stroke={C.bg.app} strokeWidth={2} />
      <Path d="M33.5 34.5h7M33.5 37h7M33.5 39.5h7" stroke={C.accent.on} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

// ───────── Categoria / Tag ─────────
export type CategoriaDaTag = 'estudo' | 'trabalho' | 'leitura' | 'criacao' | 'outro';
const ICONE_DA_CATEGORIA: Record<CategoriaDaTag, IconName> = {
  estudo: 'categoriaEstudo',
  trabalho: 'categoriaTrabalho',
  leitura: 'categoriaLeitura',
  criacao: 'categoriaCriacao',
  outro: 'categoriaOutro',
};

/** Tag de categoria do motivo da viagem (Figma: "Categoria / Tag", Tamanho = Pequeno ou Médio). */
export function CategoriaTag({ categoria, rotulo, tamanho = 'pequeno' }: { categoria: CategoriaDaTag; rotulo: string; tamanho?: 'pequeno' | 'medio' }) {
  const medio = tamanho === 'medio';
  return (
    <View style={[styles.tag, { backgroundColor: C.categoriaFundo[categoria] }, medio && styles.tagMedia]}>
      <Icon name={ICONE_DA_CATEGORIA[categoria]} size={medio ? 14 : 12} />
      <Text variant="Caption/Medium 12" style={[styles.tagTexto, { color: C.categoria[categoria] }, !medio && styles.tagTextoPequeno]}>
        {rotulo}
      </Text>
    </View>
  );
}

// ───────── Icon button ─────────
export type IconButtonProps = {
  icon: IconName;
  accessibilityLabel: string;
  onPress?: () => void;
  /** Ponto amarelo de novidade (ex.: vistas premium novas). */
  indicator?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Botão flutuante 44×44 sobre a vista do voo. */
export function IconButton({ icon, accessibilityLabel, onPress, indicator, style }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.8 }, style]}
    >
      <Icon name={icon} />
      {indicator ? <View style={styles.indicator} /> : null}
    </Pressable>
  );
}

// ───────── List option ─────────
export type ListOptionProps = {
  /** Opcional: a folha de sons do Figma v3 não tem ícones. */
  icon?: IconName;
  title: string;
  description?: string;
  selected?: boolean;
  /** Mostra a marca do Plus no lugar do rádio. */
  locked?: boolean;
  onPress?: () => void;
};

/**
 * Opção selecionável com ícone, título, descrição e rádio (ex.: sons da cabine). Fundo em 200 ms (MD3).
 * Bloqueada (`locked`) na econômica: o toque continua chegando ao `onPress`, que deve abrir o paywall
 * (regra: tocar em algo do Plus abre o paywall, a qualquer momento).
 */
export function ListOption({ icon, title, description, selected, locked, onPress }: ListOptionProps) {
  const p = useStateProgress(!!selected);
  const fundo = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 1], ['transparent', C.surface.default]),
  }));
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: !!selected }}
      accessibilityHint={locked ? 'Plus' : undefined}
      onPress={onPress}
      style={({ pressed }) => [pressed && { opacity: 0.85 }]}
    >
      <Animated.View style={[styles.option, fundo]}>
      {icon ? (
        <View style={styles.tile}>
          <Icon name={icon} />
        </View>
      ) : null}
      <View style={styles.texts}>
        <Text variant="Body/Large Medium 16" tone={selected ? 'primary' : 'secondary'}>
          {title}
        </Text>
        {description ? (
          <Text variant="Body/Small 13" tone="muted">
            {description}
          </Text>
        ) : null}
      </View>
      {locked ? <Plus tamanho="pequeno" /> : <Radio selected={selected} />}
      </Animated.View>
    </Pressable>
  );
}

// ───────── Action row ─────────
/** Linha que abre uma etapa opcional ou um bottom sheet. */
export function ActionRow({
  title,
  description,
  icon = 'plusTile',
  onPress,
}: {
  title: string;
  description?: string;
  icon?: IconName;
  onPress?: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.action, pressed && { opacity: 0.85 }]}>
      <Icon name={icon} />
      <View style={styles.texts}>
        <Text variant="Body/Large Medium 16">{title}</Text>
        {description ? (
          <Text variant="Body/Small 13" tone="tertiary" numberOfLines={1}>
            {description}
          </Text>
        ) : null}
      </View>
      <Icon name="chevronRight" />
    </Pressable>
  );
}

// ───────── Info banner ─────────
export type InfoBannerProps =
  | { type?: 'message'; message: string }
  | { type: 'live'; title: string; detail?: string };

/** Mensagem contextual: aviso de bordo (mala) ou disponibilidade ao vivo (ponto verde). */
export function InfoBanner(props: InfoBannerProps) {
  if (props.type === 'live') {
    return (
      <View style={[styles.banner, styles.bannerLive]}>
        <View style={styles.liveDot} />
        <View style={[styles.texts, { gap: space[6] }]}>
          <Text variant="Label/Medium 14" tone="secondary">
            {props.title}
          </Text>
          {props.detail ? (
            <Text variant="Caption/Regular 12" tone="tertiary">
              {props.detail}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.banner, styles.bannerMessage]}>
      <Suitcase size={36} />
      <Text variant="Caption/Medium 12" tone="tertiary" style={{ flex: 1 }}>
        {props.message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  goldText: { color: gold.ink },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space[4],
    paddingVertical: space[4],
    paddingHorizontal: space[8],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: gold.border,
    backgroundImage: GOLD_GRADIENT,
    boxShadow: `0 2px 8px ${gold.glow}`,
  },
  badgeText: { textTransform: 'uppercase', letterSpacing: 12 * 0.06 },
  seal: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space[4],
    paddingVertical: space[4],
    paddingLeft: 6,
    paddingRight: space[12],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: gold.seal.border,
    backgroundImage: SEAL_GRADIENT,
    boxShadow: `0 3px 12px ${gold.seal.glow}`,
  },
  sealMenor: { height: 24 },
  sealTexto: { paddingVertical: 6, paddingLeft: space[12] },
  sealText: { color: C.text.primary, textTransform: 'uppercase', letterSpacing: 12 * 0.08, lineHeight: 16 },
  sealTextMenor: { fontSize: 8, letterSpacing: 8 * 0.08 },
  tag: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: space[4], height: 20, paddingLeft: space[6], paddingRight: space[8], borderRadius: radius.md },
  tagMedia: { height: 24, gap: 5, paddingLeft: space[8], paddingRight: space[10] },
  tagTexto: { letterSpacing: 0, lineHeight: 16 },
  tagTextoPequeno: { fontSize: 11, lineHeight: 14 },
  plus: {
    alignSelf: 'flex-start',
    paddingVertical: space[6],
    paddingHorizontal: space[12],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: C.plus.borda,
    backgroundColor: C.plus.fundo,
  },
  plusBloqueado: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  plusPequeno: { paddingVertical: space[2], paddingHorizontal: space[8] },
  plusTexto: { fontFamily: fontFamily.pixel, fontWeight: '400', fontSize: 14, lineHeight: 20, letterSpacing: 0, color: C.text.accent },
  plusTextoPequeno: { fontSize: 12, lineHeight: 16 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radius.xl,
    backgroundColor: C.surface.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: C.bg.app,
    backgroundColor: C.accent.default,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    paddingVertical: space[10],
    paddingHorizontal: space[12],
    borderRadius: radius.lg,
  },
  tile: {
    width: 40,
    height: 40,
    borderRadius: radius.tile,
    backgroundColor: C.surface.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: space[2] },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    paddingVertical: space[14],
    paddingHorizontal: space[16],
    borderRadius: radius.lg,
    backgroundColor: C.surface.subtle,
  },
  banner: { flexDirection: 'row', borderRadius: radius.md, backgroundColor: C.surface.subtle },
  bannerMessage: { alignItems: 'center', gap: space[10], paddingVertical: space[12], paddingHorizontal: space[16] },
  bannerLive: { alignItems: 'flex-start', gap: space[12], padding: space[20] },
  liveDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: C.status.success, marginTop: 4 },
});
