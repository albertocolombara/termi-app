import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { mostrarFerramentasDev } from '@/config/env';
import { ActionRow, Button, color, screenGutter, space, Text } from '@/ds';
import { t } from '@/i18n';

/**
 * Início provisório da Fase 1 (fundação técnica).
 * O Início do produto (Termi, "Novo voo", menu lateral) entra na Fase 4.
 */
export default function Inicio() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: color.bg.app }}
      contentContainerStyle={{ paddingTop: insets.top + space[24], paddingHorizontal: screenGutter, gap: space[24] }}
    >
      <View style={{ gap: space[8] }}>
        <Text variant="Heading/Screen 32">{t('inicio.titulo')}</Text>
        <Text variant="Body/Large 16" tone="secondary">
          {t('inicio.subtitulo')}
        </Text>
      </View>

      <Button label={t('inicio.novoVoo')} onPress={() => router.push('/voo')} />

      {mostrarFerramentasDev && (
        <View style={{ gap: space[8] }}>
          <Text variant="Label/Strong 14" tone="tertiary">
            {t('inicio.ferramentas')}
          </Text>
          <ActionRow
            icon="settings"
            title={t('dev.designSystem')}
            description={t('dev.designSystemDescricao')}
            onPress={() => router.push('/dev/design-system')}
          />
          <ActionRow
            icon="windowView"
            title={t('dev.janela')}
            description={t('dev.janelaDescricao')}
            onPress={() => router.push('/dev/janela')}
          />
          <ActionRow
            icon="globe"
            title={t('dev.globo')}
            description={t('dev.globoDescricao')}
            onPress={() => router.push('/dev/globo')}
          />
          <ActionRow
            icon="crewServiceTile"
            title={t('dev.avisos')}
            description={t('dev.avisosDescricao')}
            onPress={() => router.push('/dev/avisos')}
          />
          <ActionRow
            icon="plane"
            title={t('dev.voos')}
            description={t('dev.voosDescricao')}
            onPress={() => router.push('/dev/voos')}
          />
        </View>
      )}
    </ScrollView>
  );
}
