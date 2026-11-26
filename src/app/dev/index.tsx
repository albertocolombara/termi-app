import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionRow, color, screenGutter, space, ToggleRow, TopBar } from '@/ds';
import { t } from '@/i18n';
import { useClasse, useTrocarClasseDeTeste } from '@/services/compras';

/** Ferramentas de desenvolvimento (só em builds de teste). Saíram do Início com o Início v3. */
export default function FerramentasDev() {
  const insets = useSafeAreaInsets();
  const classe = useClasse();
  const trocarClasse = useTrocarClasseDeTeste();
  return (
    <ScrollView
      style={{ backgroundColor: color.bg.app }}
      contentContainerStyle={{ paddingTop: insets.top + space[6], paddingBottom: insets.bottom + space[24], paddingHorizontal: screenGutter, gap: space[24] }}
    >
      <TopBar title={t('comum.voltar')} onBack={() => router.back()} />
      <View style={{ gap: space[8] }}>
        <ToggleRow
          title={t('dev.primeiraClasse')}
          description={t('dev.primeiraClasseDescricao')}
          value={classe === 'primeira'}
          onChange={(v) => trocarClasse(v ? 'primeira' : 'economica')}
        />
        <ActionRow icon="settings" title={t('dev.diagnostico')} description={t('dev.diagnosticoDescricao')} onPress={() => router.push('/dev/diagnostico')} />
        <ActionRow icon="settings" title={t('dev.designSystem')} description={t('dev.designSystemDescricao')} onPress={() => router.push('/dev/design-system')} />
        <ActionRow icon="windowView" title={t('dev.janela')} description={t('dev.janelaDescricao')} onPress={() => router.push('/dev/janela')} />
        <ActionRow icon="globe" title={t('dev.globo')} description={t('dev.globoDescricao')} onPress={() => router.push('/dev/globo')} />
        <ActionRow icon="crewServiceTile" title={t('dev.avisos')} description={t('dev.avisosDescricao')} onPress={() => router.push('/dev/avisos')} />
        <ActionRow icon="plane" title={t('dev.voos')} description={t('dev.voosDescricao')} onPress={() => router.push('/dev/voos')} />
      </View>
    </ScrollView>
  );
}
