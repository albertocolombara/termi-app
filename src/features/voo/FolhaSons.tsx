/**
 * 04D · Som da cabine (bottom sheet, Figma v3: sem ícones). PRD: RF-18, RN-18, RN-20.
 * Motores e ruído branco são grátis; cabine, chuva e lofi são da primeira classe.
 * Na econômica, tocar num som com selo abriria o paywall (RN-20), que entra na Fase 4.
 * "Sem som" não está no Figma: sem ele, só dava para silenciar baixando o volume a zero.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { SOM_PREMIUM, SOM_PRONTO, SONS, somLiberado, type Som } from '@/domain/sons/catalogo';
import type { Classe } from '@/domain/sessao/duracao';
import { BottomSheet, color, Icon, Plus, radius, Slider, space, Text, type IconName } from '@/ds';
import { t, type ChaveDeTexto } from '@/i18n';

const ICONE_SOM: Record<Som, IconName> = {
  cruzeiro: 'plane',
  'ruido-branco': 'soundWhiteNoise',
  motores: 'soundEngine',
  cabine: 'soundCabin',
  chuva: 'soundRain',
  lofi: 'soundLofi',
};

export function FolhaSons({
  visivel,
  classe,
  emUso,
  volume,
  onEscolher,
  onVolume,
  onPrimeiraClasse,
  onFechar,
}: {
  visivel: boolean;
  classe: Classe;
  emUso: Som | null;
  volume: number;
  onEscolher: (s: Som | 'nenhum') => void;
  onVolume: (v: number) => void;
  /** Som com cadeado na econômica: abre o paywall (RN-20, RF-25). */
  onPrimeiraClasse: () => void;
  onFechar: () => void;
}) {
  const [aviso, setAviso] = useState<ChaveDeTexto | null>(null);
  const gratis = SONS.filter((s) => !SOM_PREMIUM[s]);
  const plusSons = SONS.filter((s) => SOM_PREMIUM[s]);
  const mudo = emUso === null;

  const tocar = (s: Som) => {
    if (!SOM_PRONTO[s]) return setAviso('sons.emBreveAviso');
    if (!somLiberado(s, classe)) {
      setAviso(null);
      return onPrimeiraClasse();
    }
    setAviso(null);
    onEscolher(s);
  };

  const renderSom = (s: Som) => {
    const selecionado = emUso === s;
    const bloqueado = SOM_PREMIUM[s] && classe !== 'primeira';
    return (
      <Pressable
        key={s}
        accessibilityRole="radio"
        accessibilityState={{ selected: selecionado }}
        accessibilityHint={bloqueado ? 'Plus' : undefined}
        onPress={() => tocar(s)}
        style={({ pressed }) => [styles.linha, selecionado && styles.linhaAtiva, pressed && { opacity: 0.8 }]}
      >
        <Icon name={ICONE_SOM[s]} size={20} color={selecionado ? color.accent.default : color.text.tertiary} />
        <View style={{ flex: 1, gap: space[2] }}>
          <Text variant="Body/Large Medium 16" tone={selecionado ? 'primary' : 'secondary'}>
            {t(`sons.${s}.nome` as ChaveDeTexto)}
          </Text>
          <Text variant="Caption/Regular 12" tone="tertiary" numberOfLines={1}>
            {SOM_PRONTO[s] ? t(`sons.${s}.descricao` as ChaveDeTexto) : t('sons.emBreve')}
          </Text>
        </View>
        {bloqueado ? (
          <Icon name="lock" size={16} color={color.text.muted} />
        ) : selecionado ? (
          <Icon name="confirmacao" size={16} color={color.accent.default} />
        ) : null}
      </Pressable>
    );
  };

  return (
    <BottomSheet
      visible={visivel}
      onClose={() => {
        setAviso(null);
        onFechar();
      }}
      title={t('sons.titulo')}
      headerRight={
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: mudo }}
          onPress={() => onEscolher('nenhum')}
          style={({ pressed }) => [styles.mudo, mudo && styles.mudoAtivo, pressed && { opacity: 0.8 }]}
        >
          <Icon name="speaker" size={14} color={mudo ? color.accent.default : color.text.secondary} />
          <Text variant="Caption/Medium 12" tone={mudo ? 'accent' : 'secondary'}>
            Mudo
          </Text>
        </Pressable>
      }
    >
      <View accessibilityRole="radiogroup" style={{ gap: space[4] }}>
        {gratis.map(renderSom)}
        {classe !== 'primeira' ? (
          <View style={styles.divisorPlus}>
            <Plus tamanho="pequeno" />
            <View style={styles.linhaDivisor} />
          </View>
        ) : null}
        {plusSons.map(renderSom)}
      </View>
      {aviso ? (
        <Text variant="Caption/Regular 12" accessibilityLiveRegion="polite">
          {t(aviso)}
        </Text>
      ) : null}
      <View style={{ paddingTop: space[12] }}>
        <Slider label={t('sons.volume')} value={volume} onChange={onVolume} muted={mudo} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  mudo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[6],
    paddingVertical: space[6],
    paddingHorizontal: space[12],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.border.pillOutline,
  },
  mudoAtivo: {
    borderColor: color.border.accent,
    backgroundColor: color.accent.container,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[14],
    paddingVertical: space[10],
    paddingHorizontal: space[12],
    borderRadius: radius.cta,
  },
  linhaAtiva: {
    backgroundColor: color.surface.card,
  },
  divisorPlus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[10],
    paddingVertical: space[6],
    paddingHorizontal: space[4],
  },
  linhaDivisor: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: color.border.subtle,
  },
});
