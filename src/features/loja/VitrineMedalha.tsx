/**
 * Medalha 3D que gira com o dedo (vitrine da loja L1 e destaque da mala M1b).
 *
 * É a mesma cena do protótipo "Termi · Souvenir" (three.js), aberta numa WebView: o WebGL do
 * Chrome do Android dá a fluidez do protótipo, com giro livre, inércia e volta de frente.
 * A página fica no R2 (`colecao/vitrine/v1/index.html`, publicada pelo coletor) e carrega o
 * `modelo3d` do catálogo. Decisão do Alberto em 26/11/2026, depois que o Filament fechou o app
 * no RN 0.88 e o giro de quadros não ficou fluido.
 *
 * Enquanto a cena carrega, sem rede ou se der erro, aparece a medalha 2D: nada fica vazio.
 * "Reduzir movimento" desliga o balanço e a mola (volta de frente na hora).
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { env } from '@/config/env';
import type { Souvenir } from '@/domain/colecao/catalogo';
import { t } from '@/i18n';

import { Medalha } from './Medalha';

const VITRINE = 'colecao/vitrine/v1/index.html';

export function VitrineMedalha({ souvenir, tamanho }: { souvenir: Souvenir; tamanho: number }) {
  const [estado, setEstado] = useState<'carregando' | 'pronto' | 'erro'>('carregando');
  const [reduzir, setReduzir] = useState<boolean | null>(null);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduzir)
      .catch(() => setReduzir(false));
  }, []);

  const url =
    souvenir.modelo3d && env.tilesBaseUrl && reduzir !== null
      ? `${env.tilesBaseUrl}/${VITRINE}?glb=${encodeURIComponent(souvenir.modelo3d)}&reduzir=${reduzir ? 1 : 0}`
      : null;

  return (
    <View
      style={{ width: tamanho, height: tamanho }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={t('loja.medalhaAcessivel', { nome: souvenir.nome })}
      accessibilityHint={url && estado !== 'erro' ? t('loja.arrasteParaGirar') : undefined}
    >
      {estado === 'pronto' ? null : <Medalha souvenir={souvenir} tamanho={tamanho} />}
      {url && estado !== 'erro' ? (
        <WebView
          source={{ uri: url }}
          style={[StyleSheet.absoluteFill, styles.transparente, { opacity: estado === 'pronto' ? 1 : 0 }]}
          containerStyle={styles.transparente}
          originWhitelist={['https://*']}
          onMessage={(e) => {
            const m = e.nativeEvent.data;
            if (m === 'pronto' || m === 'erro') setEstado(m);
          }}
          onError={() => setEstado('erro')}
          onHttpError={() => setEstado('erro')}
          // A página só desenha a medalha: sem rolagem, zoom, seleção ou navegação.
          scrollEnabled={false}
          overScrollMode="never"
          setBuiltInZoomControls={false}
          setSupportMultipleWindows={false}
          onShouldStartLoadWithRequest={(r) => r.url.startsWith(`${env.tilesBaseUrl}/${VITRINE}`)}
          androidLayerType="hardware"
          importantForAccessibility="no-hide-descendants"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  transparente: { backgroundColor: 'transparent' },
});
