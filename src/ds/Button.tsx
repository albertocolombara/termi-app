import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { color as C, hitSlop, radius, space } from './tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'link';
export type ButtonSize = 'large' | 'medium' | 'small' | 'mini';

export type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  /** primary = amarelo; secondary = superfície translúcida (small/mini = contorno pill); link = só texto. */
  variant?: ButtonVariant;
  /**
   * large = rótulo à esquerda + ícone à direita (`SPACE_BETWEEN`, `paddingHorizontal: 20`, `radius: 16`; sem ícone, centralizado);
   * medium = centralizado (`radius: 16`); small = pílula de contorno (`38px`);
   * mini = pílula discreta (`30px`) para ações sobre a janela e o embarque ("Pousar antes", "Cancelar embarque").
   */
  size?: ButtonSize;
  /** Ícone à direita no tamanho large. Padrão: seta. `null` remove. */
  icon?: IconName | null;
  /** Estado de carregamento (Design System v2 · 02B Botões & Estados). */
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Button (Design System v2 · 02B Botões & Estados).
 * Primary Large é o CTA de rodapé (`radius 16`, `SPACE_BETWEEN` com seta); Primary Medium o CTA de bottom sheet;
 * Secondary Surface/Outline Pill/Mini as ações secundárias; Link a ação silenciosa sem sublinhado.
 */
export function Button({ label, variant = 'primary', size = 'large', icon = 'arrowRight', loading, disabled, style, ...rest }: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isLink = variant === 'link';
  const isMini = size === 'mini';
  const isOutline = (variant === 'secondary' && size === 'small') || isMini;
  const isDisabled = !!disabled || !!loading;
  const fg = isPrimary ? C.text.onAccent : isLink ? C.text.muted : C.text.primary;
  const comIcone = size === 'large' && !isLink && !isOutline && !loading && !!icon;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: !!loading }}
      hitSlop={size === 'small' || isMini || isLink ? hitSlop : undefined}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        isLink
          ? [styles.link, pressed && styles.linkPressed]
          : isOutline
            ? [isMini ? styles.mini : styles.outline, pressed && styles.outlinePressed]
            : size === 'large'
              ? [styles.large, (!icon || loading) && styles.centro]
              : styles.medium,
        !isLink && !isOutline && { backgroundColor: isPrimary ? C.accent.default : C.surface.default },
        isPrimary && !disabled && styles.primaryRim,
        !isLink && !isOutline && pressed && (isPrimary ? styles.pressedPrimary : styles.pressedSurface),
        disabled && styles.disabled,
        loading && styles.loading,
        style,
      ]}
      {...rest}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : null}
      <Text variant={isPrimary && size === 'large' ? 'Button/Label Strong 16' : rotulo(size)} style={{ color: fg }} numberOfLines={1}>
        {label}
      </Text>
      {comIcone ? (
        <View accessibilityElementsHidden importantForAccessibility="no">
          <Icon name={icon} size={16} color={fg} />
        </View>
      ) : null}
    </Pressable>
  );
}

function rotulo(size: ButtonSize) {
  if (size === 'mini') return 'Caption/Regular 12' as const;
  if (size === 'small') return 'Button/Label 14' as const;
  return 'Button/Label 16' as const;
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', gap: space[10] },
  large: {
    justifyContent: 'space-between',
    paddingHorizontal: space[20],
    minHeight: 54,
    borderRadius: radius.cta,
  },
  centro: { justifyContent: 'center' },
  medium: {
    justifyContent: 'center',
    paddingHorizontal: space[20],
    paddingVertical: space[14],
    minHeight: 50,
    borderRadius: radius.cta,
  },
  primaryRim: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  outline: {
    alignSelf: 'flex-start',
    gap: space[8],
    paddingHorizontal: space[16],
    minHeight: 38,
    borderWidth: 1,
    borderColor: C.border.pillOutline,
    backgroundColor: C.surface.subtle,
    borderRadius: radius.full,
  },
  mini: {
    alignSelf: 'flex-start',
    gap: space[6],
    paddingHorizontal: space[12],
    minHeight: 30,
    borderWidth: 1,
    borderColor: C.border.pillOutline,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radius.full,
  },
  outlinePressed: {
    backgroundColor: C.border.pillOutline,
    borderColor: C.border.input,
  },
  link: {
    alignSelf: 'flex-start',
    paddingVertical: space[10],
    paddingHorizontal: space[14],
    borderRadius: radius.xl,
  },
  linkPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  pressedPrimary: { opacity: 0.82 },
  pressedSurface: { backgroundColor: C.state.pressedSurface },
  loading: { opacity: 0.88 },
  disabled: { opacity: 0.38 },
});
