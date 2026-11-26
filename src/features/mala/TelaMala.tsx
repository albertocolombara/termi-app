/**
 * M1 · Sua mala (Figma v3: X6 · Mala vazia e M1d · coleção). PRD: RF-30, RN-14, RN-16, RN-17; UC-09.
 *
 * Mostra os espaços da coleção pelo catálogo (o total nunca é fixo no código), os souvenirs
 * comprados e a entrada para "Lojas dos seus pousos" com a marca Plus (decidido pelo Alberto em
 * 25/11/2026; RN-14, UC-08 A6). Na econômica a entrada aparece e leva à tela bloqueada (L2b).
 * A medalha 3D (M1b) entra com a vitrine.
 */
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCatalogo } from '@/data/colecao/catalogo';
import { useContagens, useSouvenirsNaMala } from '@/data/historico/useHistorico';
import { color, Icon, Plus, radius, screenGutter, space, Suitcase, Text, TopBar } from '@/ds';
import { Medalha } from '@/features/loja/Medalha';
import { t } from '@/i18n';

export function TelaMala() {
  const insets = useSafeAreaInsets();
  const naMala = new Set(useSouvenirsNaMala().data ?? []);
  const catalogo = useCatalogo();
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
              {t('mala.contagem', { n: naMala.size, total: catalogo.length })}
            </Text>
            <View style={styles.saldo}>
              <Text variant="Label/Strong 14">{t('mala.saldo', { valor: saldo.toLocaleString('pt-BR') })}</Text>
            </View>
          </View>

          <View style={styles.grade}>
            {catalogo.map((s) => {
              const tem = naMala.has(s.id);
              const nome = (
                <Text variant="Caption/Regular 12" tone={tem ? 'primary' : 'muted'} numberOfLines={1}>
                  {s.nome}
                </Text>
              );
              // Medalha comprada: toque abre o destaque (M1b), com a medalha em 3D.
              return tem ? (
                <Pressable
                  key={s.id}
                  style={({ pressed }) => [styles.espaco, pressed && { opacity: 0.85 }]}
                  accessibilityRole="button"
                  accessibilityLabel={t('mala.abrirSouvenir', { nome: s.nome })}
                  onPress={() => router.push({ pathname: '/mala/[id]', params: { id: s.id } })}
                >
                  <Medalha souvenir={s} tamanho={64} />
                  {nome}
                </Pressable>
              ) : (
                <View key={s.id} style={styles.espaco} accessible accessibilityLabel={s.nome}>
                  <View style={[styles.encaixe, styles.encaixeVazio]} />
                  {nome}
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

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t('mala.lojas')}, Plus. ${t('mala.lojasDescricao')}`}
            onPress={() => router.push('/loja')}
            style={({ pressed }) => [styles.lojas, pressed && { opacity: 0.85 }]}
          >
            <Icon name="suitcaseLine" />
            <View style={{ flex: 1, gap: space[2] }}>
              <View style={styles.tituloDasLojas}>
                <Text variant="Body/Large Medium 16">{t('mala.lojas')}</Text>
                <Plus tamanho="pequeno" />
              </View>
              <Text variant="Body/Small 13" tone="tertiary" numberOfLines={1}>
                {t('mala.lojasDescricao')}
              </Text>
            </View>
            <Icon name="chevronRight" />
          </Pressable>

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
  lojas: { flexDirection: 'row', alignItems: 'center', gap: space[12], minHeight: 64, paddingVertical: space[12], paddingHorizontal: space[14], borderRadius: radius.xl, backgroundColor: color.surface.default },
  tituloDasLojas: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: space[14], paddingVertical: space[14], paddingHorizontal: space[16], borderRadius: radius.xl, borderWidth: 1, borderColor: color.border.subtle },
});
