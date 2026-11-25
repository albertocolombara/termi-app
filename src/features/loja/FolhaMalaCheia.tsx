/**
 * P2 · Mala de amostra cheia (Figma v3: "P2 · Mala de amostra cheia", textos atualizados para o
 * limite de 2 e o nome Plus). PRD: RN-14, RN-20; UC-08 A3.
 * Só abre quando o usuário toca em comprar: nada de oferta que ele não pediu.
 */
import { View } from 'react-native';
import { router } from 'expo-router';

import { LIMITE_DA_ECONOMICA } from '@/domain/colecao/loja';
import { BottomSheet, Button, space } from '@/ds';
import { t } from '@/i18n';

export function FolhaMalaCheia({ visivel, onFechar }: { visivel: boolean; onFechar: () => void }) {
  return (
    <BottomSheet
      visible={visivel}
      onClose={onFechar}
      title={t('loja.malaCheiaTitulo')}
      subtitle={t('loja.malaCheiaTexto', { limite: LIMITE_DA_ECONOMICA })}
      footer={
        <View style={{ gap: space[4] }}>
          <Button
            size="medium"
            icon={null}
            label={t('loja.conhecerPlus')}
            onPress={() => {
              onFechar();
              router.push('/primeira-classe');
            }}
          />
          <Button variant="link" size="medium" label={t('loja.agoraNao')} onPress={onFechar} style={{ alignSelf: 'center' }} />
        </View>
      }
    />
  );
}
