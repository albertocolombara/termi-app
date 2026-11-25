/**
 * Vitrine 3D de teste (ferramenta de desenvolvimento, Fase 4): valida o react-native-filament
 * (ADR-12, [Proposta]) antes de ele virar padrão. Mostra uma medalha GLB que gira com o dedo e volta
 * de frente ao soltar (M1b). Medir no aparelho: memória com a vitrine aberta e ao sair, e o tamanho
 * do APK com e sem a biblioteca.
 *
 * A medalha é um disco de teste gerado; as medalhas reais (pasta Medalhas/glb) entram com o catálogo.
 */
import { useState } from 'react';
import { PanResponder, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, DefaultLight, FilamentScene, FilamentView, Model } from 'react-native-filament';
import { useSharedValue } from 'react-native-worklets-core';

import { color, screenGutter, space, Text, TopBar } from '@/ds';
import { t } from '@/i18n';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const MEDALHA = require('../../../assets/colecao/medalha_teste.glb');

function Vitrine() {
  const rotacao = useSharedValue<[number, number, number]>([0, 0, 0]);
  // PanResponder criado uma vez; o ângulo e a animação de volta vivem dentro dele.
  const [pan] = useState(() => {
    let angulo = 0;
    let volta: number | null = null;
    const aplicar = (y: number) => {
      angulo = y;
      rotacao.value = [0, y, 0];
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        if (volta) cancelAnimationFrame(volta);
      },
      onPanResponderMove: (_, g) => aplicar(g.dx * 0.012),
      onPanResponderRelease: () => {
        // Volta de frente ao soltar (M1b), com easing suave.
        const de = angulo;
        const inicio = Date.now();
        const passo = () => {
          const k = Math.min(1, (Date.now() - inicio) / 600);
          aplicar(de * (1 - k) ** 3);
          if (k < 1) volta = requestAnimationFrame(passo);
        };
        volta = requestAnimationFrame(passo);
      },
    });
  });

  return (
    <View style={{ flex: 1 }} {...pan.panHandlers}>
      <FilamentView style={{ flex: 1 }}>
        <DefaultLight />
        <Camera cameraPosition={[0, 0, 2.2]} cameraTarget={[0, 0, 0]} />
        <Model source={MEDALHA} transformToUnitCube rotate={rotacao} multiplyWithCurrentTransform={false} />
      </FilamentView>
    </View>
  );
}

export default function VitrineDeTeste() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: color.bg.app, paddingTop: insets.top + space[12], paddingBottom: insets.bottom + space[24] }}>
      <View style={{ paddingHorizontal: screenGutter }}>
        <TopBar title={t('comum.voltar')} onBack={() => router.back()} />
      </View>
      <FilamentScene>
        <Vitrine />
      </FilamentScene>
      <Text variant="Body/Medium 14" tone="secondary" style={{ textAlign: 'center' }}>
        {t('dev.vitrineDica')}
      </Text>
    </View>
  );
}
