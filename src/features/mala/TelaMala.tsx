/**
 * M1 · Sua mala (Figma v3: X6 · Mala vazia e M1d · coleção). PRD: RF-30, RN-14, RN-16, RN-17; UC-09.
 *
 * A loja do destino ainda não existe (Fase 4), então hoje a mala só pode estar vazia: mostra os
 * espaços da coleção pelo catálogo (o total nunca é fixo no código) e o convite para voar.
 * Quando houver souvenirs, o espaço do país aparece preenchido; a medalha 3D (M1b) entra com a loja.
 */
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CATALOGO } from '@/data/colecao/catalogo';
import { useContagens, useSouvenirsNaMala } from '@/data/historico/useHistorico';
import { Button, color, radius, screenGutter, space, Suitcase, Text, TopBar } from '@/ds';
import { t } from '@/i18n';

export function TelaMala() {
  const insets = useSafeAreaInsets();
  const naMala = new Set(useSouvenirsNaMala().data ?? []);
  const saldo = useContagens().data?.saldo ?? 0;
  const vazia = naMala.size === 0;

  return (
    <ScrollView
      style={styles.tela}
      contentContainerStyle={[styles.conteudo, { paddingTop: insets.top + space[6], paddingBottom: insets.bottom + space[24] }]}
    >
      <View style={{ gap: space[24] }}>
        <TopBar title={t('mala.titulo')} onBack={() => router.back()} />
        <View style={{ gap: space[16] }}>
          <View style={styles.linha}>
            <Text variant="Label/Medium 14" tone="secondary">
              {t('mala.contagem', { n: naMala.size, total: CATALOGO.length })}
            </Text>
            <View style={styles.saldo}>
              <Text variant="Label/Strong 14">{t('mala.saldo', { valor: saldo.toLocaleString('pt-BR') })}</Text>
            </View>
          </View>

          <View style={styles.grade}>
            {CATALOGO.map((s) => {
              const tem = naMala.has(s.id);
              return (
                <View key={s.id} style={styles.espaco} accessible accessibilityLabel={s.nome}>
                  <View style={[styles.encaixe, tem ? styles.encaixeCheio : styles.encaixeVazio]} />
                  <Text variant="Caption/Regular 12" tone={tem ? 'primary' : 'muted'} numberOfLines={1}>
                    {s.nome}
                  </Text>
                </View>
              );
            })}
            <View style={styles.espaco} accessible accessibilityLabel={t('mala.emBreve')}>
              <View style={[styles.encaixe, styles.encaixeVazio, { backgroundColor: color.bg.sheet }]} />
              <Text variant="Caption/Regular 12" tone="muted">
                {t('mala.emBreve')}
              </Text>
            </View>
          </View>

          {vazia ? (
            <View style={styles.aviso}>
              <Suitcase size={36} />
              <View style={{ flex: 1, gap: space[2] }}>
                <Text variant="Label/Strong 14">{t('mala.vaziaTitulo')}</Text>
                <Text variant="Body/Small 13" tone="tertiary">
                  {t('mala.vaziaTexto')}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      </View>

      {vazia ? <Button variant="secondary" label={t('mala.encontrarVoos')} onPress={() => router.push('/voo')} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: color.bg.app },
  conteudo: { flexGrow: 1, justifyContent: 'space-between', gap: space[24], paddingHorizontal: screenGutter },
  linha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  saldo: { paddingVertical: space[6], paddingHorizontal: space[12], borderRadius: radius.full, backgroundColor: color.surface.default },
  grade: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space[12] },
  espaco: { width: '25%', alignItems: 'center', gap: space[6] },
  encaixe: { width: 64, height: 64, borderRadius: 32 },
  encaixeVazio: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.border.strong },
  encaixeCheio: { backgroundColor: color.surface.strong, borderWidth: 1.5, borderColor: color.border.default },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: space[14], paddingVertical: space[14], paddingHorizontal: space[16], borderRadius: radius.xl, backgroundColor: color.surface.subtle },
});
