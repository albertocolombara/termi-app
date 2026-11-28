/**
 * M6 · Sobre o Termi (Figma v4 Clean · 836:25964). PRD: RN-25.
 * Lista limpa sem caixas (hairlines), notas legais (sem logo da NASA e deixando claro que não há apoio)
 * e atalhos para Termos, Privacidade e Licenças.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet, Button, color, screenGutter, space, Suitcase, Text, TopBar } from '@/ds';
import { t, type ChaveDeTexto } from '@/i18n';

import { LinhaComValor, Secao } from '../ajustes/Grupo';

const CREDITOS: [ChaveDeTexto, ChaveDeTexto][] = [
  ['sobre.voosAoVivo', 'sobre.voosAoVivoFonte'],
  ['sobre.imagens', 'sobre.imagensFonte'],
  ['sobre.paisagem', 'sobre.paisagemFonte'],
  ['sobre.lugares', 'sobre.lugaresFonte'],
  ['sobre.sons', 'sobre.sonsFonte'],
  ['sobre.fotos', 'sobre.fotosFonte'],
];

export function TelaSobre() {
  const insets = useSafeAreaInsets();
  const [emBreve, setEmBreve] = useState(false);

  return (
    <View style={styles.tela}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + space[6],
          paddingBottom: insets.bottom + space[32],
          paddingHorizontal: screenGutter,
          gap: space[24],
        }}
      >
        <TopBar title={t('sobre.titulo')} onBack={() => router.back()} />

        <View style={{ gap: space[12] }}>
          <View style={styles.marca}>
            <Suitcase size={48} />
            <View style={{ gap: space[2] }}>
              <Text variant="Nav/Title 20" style={styles.nome}>
                {t('sobre.nome')}
              </Text>
              <Text variant="Caption/Regular 12" tone="tertiary">
                {t('sobre.versao', { versao: Constants.expoConfig?.version ?? '' })}
              </Text>
            </View>
          </View>
          <Text variant="Body/Medium 14" tone="secondary">
            {t('sobre.texto')}
          </Text>
        </View>

        <Secao titulo={t('sobre.dadosECreditos')}>
          {CREDITOS.map(([titulo, fonte]) => (
            <View key={titulo} style={styles.credito}>
              <Text variant="Label/Medium 14" style={styles.tituloCredito}>
                {t(titulo)}
              </Text>
              <Text variant="Caption/Regular 12" tone="tertiary" style={styles.fonteCredito}>
                {t(fonte)}
              </Text>
            </View>
          ))}
        </Secao>

        <View style={{ gap: space[8] }}>
          <Text variant="Caption/Regular 12" tone="tertiary">
            {t('sobre.nasa')}
          </Text>
          <Text variant="Caption/Regular 12" tone="muted">
            {t('sobre.esa')}
          </Text>
          <Text variant="Caption/Regular 12" tone="tertiary">
            {`${t('sobre.semApoio')} ${t('sobre.companhiasTexto')}`}
          </Text>
        </View>

        <Secao comTopo>
          <LinhaComValor titulo={t('sobre.termos')} onPress={() => setEmBreve(true)} />
          <LinhaComValor titulo={t('sobre.privacidade')} onPress={() => setEmBreve(true)} />
          <LinhaComValor titulo={t('sobre.licencas')} onPress={() => setEmBreve(true)} />
        </Secao>
      </ScrollView>

      <BottomSheet
        visible={emBreve}
        onClose={() => setEmBreve(false)}
        title={t('sobre.documentosEmBreveTitulo')}
        subtitle={t('sobre.documentosEmBreveTexto')}
        footer={<Button size="medium" icon={null} label={t('sobre.entendi')} onPress={() => setEmBreve(false)} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: color.bg.app },
  marca: { flexDirection: 'row', alignItems: 'center', gap: space[14] },
  nome: { fontSize: 17, lineHeight: 22, fontWeight: '500' },
  credito: { gap: space[2], paddingVertical: 11 },
  tituloCredito: { fontSize: 14, lineHeight: 19 },
  fonteCredito: { fontSize: 12.5, lineHeight: 17 },
});
