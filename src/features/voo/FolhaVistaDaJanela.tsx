/**
 * 04E · Vista da janela (bottom sheet). PRD: RF-19, RN-18, RN-20.
 * Só a janela é grátis. Na econômica, tocar numa vista da primeira classe abre o paywall (RN-20, RF-25).
 * Com asa e Asa e motor ainda não têm render: aparecem como "Em breve".
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
  'com-asa': 'vista.comAsa',
  'asa-e-motor': 'vista.asaEMotor',
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
      subtitle={t('vista.subtitulo')}
    >
      <View style={styles.grade} accessibilityRole="radiogroup">
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
              style={({ pressed }) => [styles.opcao, pressed && { opacity: 0.8 }]}
            >
              <View style={[styles.miniatura, selecionada && styles.selecionada]}>
                {mini ? (
                  <Image source={mini} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                  <View style={styles.semMiniatura}>
                    <Text variant="Caption/Medium 12" tone="tertiary">
                      {t('vista.emBreve')}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.rotulo}>
                {cadeado ? <Icon name="lock" size={12} color={color.accent.default} /> : null}
                <Text variant="Caption/Medium 12" style={{ color: selecionada ? color.text.accent : color.text.secondary }} numberOfLines={1}>
                  {t(NOME[v])}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <Text variant="Caption/Regular 12" tone={aviso ? 'primary' : 'tertiary'} style={{ paddingTop: space[8] }} accessibilityLiveRegion="polite">
        {aviso ? t(aviso) : t('vista.rodape')}
      </Text>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: space[16], paddingTop: space[4] },
  opcao: { width: 96, gap: space[8], alignItems: 'center' },
  miniatura: { width: 96, height: 128, borderRadius: radius.tile, overflow: 'hidden', backgroundColor: color.surface.default, borderWidth: 2, borderColor: 'transparent' },
  selecionada: { borderColor: color.accent.default },
  semMiniatura: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  rotulo: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
});
