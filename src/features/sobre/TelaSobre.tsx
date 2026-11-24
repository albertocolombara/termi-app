/**
 * M6 · Sobre o Termi (Figma v3: créditos dos dados). PRD: RN-25.
 * Credita os dados de terceiros sem logo da NASA e deixando claro que não há apoio da NASA.
 * Termos, privacidade e licenças entram quando os documentos existirem (antes do lançamento).
 */
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, radius, screenGutter, space, Suitcase, Text, TopBar } from '@/ds';
import { t, type ChaveDeTexto } from '@/i18n';

import { Secao } from '../ajustes/Grupo';

const CREDITOS: [ChaveDeTexto, ChaveDeTexto][] = [
  ['sobre.voosAoVivo', 'sobre.voosAoVivoFonte'],
  ['sobre.imagens', 'sobre.imagensFonte'],
  ['sobre.paisagem', 'sobre.paisagemFonte'],
  ['sobre.lugares', 'sobre.lugaresFonte'],
  ['sobre.sons', 'sobre.sonsFonte'],
];

export function TelaSobre() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.tela}
      contentContainerStyle={{ paddingTop: insets.top + space[6], paddingBottom: insets.bottom + space[32], paddingHorizontal: screenGutter, gap: space[24] }}
    >
      <TopBar title={t('sobre.titulo')} onBack={() => router.back()} />
      <View style={{ gap: space[16] }}>
        <View style={styles.marca}>
          <Suitcase size={48} />
          <View style={{ gap: space[2] }}>
            <Text variant="Label/Strong 14">{t('sobre.nome')}</Text>
            <Text variant="Caption/Regular 12" tone="tertiary">
              {t('sobre.versao', { versao: Constants.expoConfig?.version ?? '' })}
            </Text>
          </View>
        </View>
        <Text variant="Body/Medium 14" tone="secondary">
          {t('sobre.texto')}
        </Text>

        <Secao titulo={t('sobre.dadosECreditos')}>
          {CREDITOS.map(([titulo, fonte]) => (
            <View key={titulo} style={styles.credito}>
              <Text variant="Label/Medium 14">{t(titulo)}</Text>
              <Text variant="Body/Small 13" tone="tertiary">
                {t(fonte)}
              </Text>
            </View>
          ))}
        </Secao>

        <View style={{ gap: space[8], paddingVertical: space[14] }}>
          <Text variant="Caption/Regular 12" tone="tertiary">
            {t('sobre.nasa')}
          </Text>
          <Text variant="Caption/Regular 12" tone="muted">
            {t('sobre.esa')}
          </Text>
          <Text variant="Caption/Regular 12" tone="tertiary">
            {t('sobre.semApoio')}
          </Text>
        </View>

        <Secao titulo={t('sobre.companhias')}>
          <Text variant="Body/Small 13" tone="secondary" style={{ paddingVertical: space[10] }}>
            {t('sobre.companhiasTexto')}
          </Text>
        </Secao>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: color.bg.app },
  marca: { flexDirection: 'row', alignItems: 'center', gap: space[14] },
  credito: { gap: space[2], paddingVertical: space[12], borderRadius: radius.xl },
});
