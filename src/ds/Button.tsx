import React from 'react';
import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { color as C, hitSlop, radius, space } from './tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'link';
export type ButtonSize = 'large' | 'medium' | 'small' | 'mini';

export type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  /** primary = amarelo; secondary = superfície translúcida (small = contorno); link = só texto. */
  variant?: ButtonVariant;
  /**
   * large = rótulo à esquerda + ícone à direita (sem ícone, rótulo centralizado, como "Mostrar ícone" desligado no Figma);
   * medium = centralizado; small = compacto (secondary).
   * mini = contorno com rótulo de 12, para ações discretas sobre a janela e o embarque ("Pousar antes", "Cancelar embarque").
   */
  size?: ButtonSize;
  /** Ícone à direita no tamanho large. Padrão: seta. `null` remove. */
  icon?: IconName | null;
  style?: StyleProp<ViewStyle>;
};

/**
 * Button (Figma: Button · Type × Size).
 * Primary Large é o CTA de rodapé; Primary Medium o CTA de bottom sheet;
 * Secondary Small a ação discreta sobre o voo (ex.: "Pousar antes"); Link a ação alternativa.
 */
export function Button({ label, variant = 'primary', size = 'large', icon = 'arrowRight', disabled, style, ...rest }: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isLink = variant === 'link';
  const isMini = size === 'mini';
  const isOutline = (variant === 'secondary' && size === 'small') || isMini;
  const fg = isPrimary ? C.text.onAccent : C.text.primary;
  const comIcone = size === 'large' && !isLink && !isOutline && !!icon;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={size === 'small' || isMini || isLink ? hitSlop : undefined}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        isLink ? styles.link : isOutline ? styles.outline : size === 'large' ? [styles.large, !icon && styles.centro] : styles.medium,
        !isLink && !isOutline && { backgroundColor: isPrimary ? C.accent.default : C.surface.strong },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      <Text variant={isPrimary && comIcone ? 'Button/Label Strong 16' : rotulo(size)} style={{ color: fg }} numberOfLines={1}>
        {label}
      </Text>
      {comIcone ? (
        <View accessibilityElementsHidden importantForAccessibility="no">
          <Icon name={icon} color={fg} />
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * Estilo do rótulo pelo tamanho do botão, como no Material 3 Expressive (Alberto, 26/11/2026):
 * grande e médio (54–56 dp, o "médio" do M3E) usam "Button/Label 16" (Title Medium) e, no primário
 * com seta, "Button/Label Strong 16" (peso 600, para combinar com a seta; Alberto, 26/11/2026); o pequeno,
 * "Button/Label 14" (Label Large); o mini, de contorno, segue com 12. O link não tem sublinhado (Figma v3).
 */
function rotulo(size: ButtonSize) {
  if (size === 'mini') return 'Caption/Regular 12' as const;
  if (size === 'small') return 'Button/Label 14' as const;
  return 'Button/Label 16' as const;
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center' },
  large: { justifyContent: 'space-between', gap: space[14], padding: space[16], minHeight: 56 },
  centro: { justifyContent: 'center' },
  medium: { justifyContent: 'center', paddingVertical: space[14], minHeight: 54 },
  outline: {
    alignSelf: 'flex-start',
    gap: space[6],
    paddingVertical: space[8],
    paddingHorizontal: space[12],
    borderWidth: 1,
    borderColor: C.border.strong,
    borderRadius: radius.md,
  },
  link: { alignSelf: 'flex-start', paddingVertical: space[12] },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.4 },
});
