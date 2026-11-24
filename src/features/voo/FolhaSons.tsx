/**
 * 04D · Som da cabine (bottom sheet, Figma v3: sem ícones). PRD: RF-18, RN-18, RN-20.
 * Motores e ruído branco são grátis; cabine, chuva e lofi são da primeira classe.
 * Na econômica, tocar num som com selo abriria o paywall (RN-20), que entra na Fase 4.
 * "Sem som" não está no Figma: sem ele, só dava para silenciar baixando o volume a zero.
 */
import { useState } from 'react';
import { View } from 'react-native';

import { SOM_PREMIUM, SOM_PRONTO, SONS, somLiberado, type Som } from '@/domain/sons/catalogo';
import type { Classe } from '@/domain/sessao/duracao';
import { BottomSheet, ListOption, Slider, space, Text } from '@/ds';
import { t, type ChaveDeTexto } from '@/i18n';

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
  const tocar = (s: Som) => {
    if (!SOM_PRONTO[s]) return setAviso('sons.emBreveAviso');
    if (!somLiberado(s, classe)) {
      setAviso(null);
      return onPrimeiraClasse();
    }
    setAviso(null);
    onEscolher(s);
  };
  return (
    <BottomSheet
      visible={visivel}
      onClose={() => {
        setAviso(null);
        onFechar();
      }}
      title={t('sons.titulo')}
      subtitle={t('sons.subtitulo')}
    >
      <View accessibilityRole="radiogroup">
        {SONS.map((s) => (
          <ListOption
            key={s}
            title={t(`sons.${s}.nome` as ChaveDeTexto)}
            description={SOM_PRONTO[s] ? t(`sons.${s}.descricao` as ChaveDeTexto) : t('sons.emBreve')}
            selected={emUso === s}
            locked={SOM_PREMIUM[s] && classe !== 'primeira'}
            onPress={() => tocar(s)}
          />
        ))}
        <ListOption title={t('sons.nenhum')} selected={emUso === null} onPress={() => onEscolher('nenhum')} />
      </View>
      {aviso ? (
        <Text variant="Caption/Regular 12" accessibilityLiveRegion="polite">
          {t(aviso)}
        </Text>
      ) : null}
      <View style={{ paddingTop: space[12] }}>
        <Slider label={t('sons.volume')} value={volume} onChange={onVolume} />
      </View>
    </BottomSheet>
  );
}
