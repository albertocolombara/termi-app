/**
 * 04E · Vista da janela (bottom sheet). PRD: RF-19, RN-18, RN-20.
 * Só a janela é grátis. Na econômica, tocar numa vista da primeira classe abre o paywall (RN-20, RF-25).
 * Vistas do lançamento: Janela (grátis), Asa e Sem moldura (Plus). Miniaturas: renders v3 do Alberto.
 */
import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { CAMADAS_DA_VISTA, VISTAS, vistaLiberada, vistaPremium, type Vista } from '@/domain/janela/vistas';
import type { Classe } from '@/domain/sessao/duracao';
import { BottomSheet, color, Icon, radius, space, Text } from '@/ds';
import { t, type ChaveDeTexto } from '@/i18n';

const MINIATURA: Partial<Record<Vista, number>> = {
  'so-janela': require('../../../assets/janela/miniatura_so-janela.jpg'),
  'asa-completa': require('../../../assets/janela/miniatura_asa-completa.jpg'),
  'sem-moldura': require('../../../assets/janela/miniatura_sem-moldura.jpg'),
};

const NOME: Record<Vista, ChaveDeTexto> = {
  'so-janela': 'vista.soJanela',
  'asa-completa': 'vista.asaCompleta',
  'sem-moldura': 'vista.semModura',
};

export function FolhaVistaDaJanela({
  visivel,
  classe,
  emUso,
  onEscolher,
  onPrimeiraClasse,
  onFechar,
}: {
  visivel: boolean;
  classe: Classe;
  emUso: Vista;
  onEscolher: (v: Vista) => void;
  /** Vista com cadeado na econômica: abre o paywall. */
  onPrimeiraClasse: () => void;
  onFechar: () => void;
}) {
  const [aviso, setAviso] = useState<ChaveDeTexto | null>(null);
  const [largura, setLargura] = useState(0);
  const tocar = (v: Vista) => {
    if (!CAMADAS_DA_VISTA[v].pronta) return setAviso('vista.emBreveAviso');
    if (!vistaLiberada(v, classe)) {
      setAviso(null);
      return onPrimeiraClasse();
    }
    setAviso(null);
    onEscolher(v);
  };
  return (
    <BottomSheet
      visible={visivel}
      onClose={() => {
        setAviso(null);
        onFechar();
      }}
      title={t('vista.titulo')}
      headerRight={
        classe !== 'primeira' ? (
          <View style={styles.badgePlus}>
            <Text variant="Caption/Medium 12" tone="accent" style={{ fontSize: 11.5 }}>
              2 vistas no Plus
            </Text>
          </View>
        ) : undefined
      }
    >
      <View
        style={styles.grade}
        accessibilityRole="radiogroup"
        onLayout={(e) => setLargura((e.nativeEvent.layout.width - space[10] * (VISTAS.length - 1)) / VISTAS.length)}
      >
        {VISTAS.map((v) => {
          const selecionada = v === emUso;
          const pronta = CAMADAS_DA_VISTA[v].pronta;
          const cadeado = vistaPremium(v) && classe !== 'primeira';
          const mini = MINIATURA[v];
          return (
            <Pressable
              key={v}
              accessibilityRole="radio"
              accessibilityState={{ selected: selecionada, disabled: !pronta }}
              accessibilityLabel={`${t(NOME[v])}${!pronta ? `, ${t('vista.emBreve')}` : cadeado ? `, ${t('vista.primeiraClasse')}` : ''}`}
              onPress={() => tocar(v)}
              style={({ pressed }) => [styles.opcao, pressed && { opacity: 0.85 }]}
            >
              <View style={[styles.miniatura, { width: largura, height: (largura * 4) / 3 }, selecionada && styles.selecionada]}>
                {mini && largura > 0 ? (
                  <Image source={mini} style={{ width: largura, height: (largura * 4) / 3 }} resizeMode="cover" />
                ) : (
                  <View style={styles.semMiniatura}>
                    <Text variant="Caption/Medium 12" tone="tertiary">
                      {t('vista.emBreve')}
                    </Text>
                  </View>
                )}
                <View pointerEvents="none" style={styles.degradeMini} />
                {selecionada ? (
                  <View style={styles.checkBadge}>
                    <Icon name="confirmacao" size={12} color={color.accent.on} />
                  </View>
                ) : cadeado ? (
                  <View style={styles.lockBadge}>
                    <Icon name="lock" size={12} color={color.text.primary} />
                  </View>
                ) : null}
                <Text variant="Caption/Medium 12" style={styles.rotuloMini} numberOfLines={1}>
                  {t(NOME[v])}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      {aviso ? (
        <Text variant="Caption/Regular 12" style={{ paddingTop: space[8] }} accessibilityLiveRegion="polite">
          {t(aviso)}
        </Text>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  badgePlus: {
    paddingVertical: space[4],
    paddingHorizontal: space[10],
    borderRadius: radius.full,
    backgroundColor: color.accent.container,
  },
  grade: { flexDirection: 'row', gap: space[10], paddingTop: space[4] },
  opcao: { flex: 1, alignItems: 'center' },
  miniatura: { borderRadius: radius.cta, overflow: 'hidden', backgroundColor: color.surface.card, borderWidth: 2, borderColor: 'transparent' },
  selecionada: { borderColor: color.accent.default },
  semMiniatura: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  degradeMini: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '45%',
    backgroundImage: 'linear-gradient(180deg, transparent 0%, rgba(11, 13, 18, 0.85) 100%)',
  },
  checkBadge: {
    position: 'absolute',
    top: space[8],
    right: space[8],
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: color.accent.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockBadge: {
    position: 'absolute',
    top: space[8],
    right: space[8],
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(11, 13, 18, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotuloMini: {
    position: 'absolute',
    left: space[8],
    right: space[8],
    bottom: space[8],
    color: color.text.primary,
  },
});
