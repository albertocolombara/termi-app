import { View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, InfoBanner, screenGutter, space, TopBar } from '@/ds';
import { t } from '@/i18n';

/** Provisório: a tela 05 · Embarcando entra no próximo passo da Fase 3. */
export default function Embarque() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: color.bg.app, paddingTop: insets.top + space[6], paddingHorizontal: screenGutter, gap: space[20] }}>
      <TopBar title={t('comum.voltar')} onBack={() => router.back()} />
      <InfoBanner message={t('embarque.emBreve')} />
    </View>
  );
}
