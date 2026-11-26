/**
 * Cena do Filament da medalha 3D (carregada só quando a vitrine 3D está ligada; ver Medalha3D).
 * Os GLBs vêm do Blender com a face para cima (+Y no glTF): girar 90° em X deixa a face para a câmera.
 * As rotações do Filament são aplicadas na ordem X, Y, Z (no mundo), então Y gira em torno da vertical.
 */
import { useEffect, useState } from 'react';
import { PanResponder, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { Camera, DefaultLight, FilamentScene, FilamentView, ModelRenderer, useModel } from 'react-native-filament';
import { useSharedValue } from 'react-native-worklets-core';

const DE_FRENTE = Math.PI / 2;

export function CenaFilament(props: { url: string; onPronto: () => void }) {
  return (
    <FilamentScene>
      <Cena {...props} />
    </FilamentScene>
  );
}

function Cena({ url, onPronto }: { url: string; onPronto: () => void }) {
  const reduzirMovimento = useReducedMotion();
  const modelo = useModel({ uri: url });
  const rotacao = useSharedValue<[number, number, number]>([DE_FRENTE, 0, 0]);
  const carregado = modelo.state === 'loaded';
  useEffect(() => {
    if (carregado) onPronto();
  }, [carregado, onPronto]);

  // PanResponder criado uma vez; o ângulo e a volta de frente vivem dentro dele.
  const [pan] = useState(() => {
    let angulo = 0;
    let volta: number | null = null;
    const aplicar = (y: number) => {
      angulo = y;
      rotacao.value = [DE_FRENTE, y, 0];
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        if (volta) cancelAnimationFrame(volta);
      },
      onPanResponderMove: (_, g) => aplicar(g.dx * 0.012),
      onPanResponderRelease: () => {
        if (reduzirMovimento) return aplicar(0);
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
    <View style={{ flex: 1, opacity: modelo.state === 'loaded' ? 1 : 0 }} {...pan.panHandlers}>
      <FilamentView style={{ flex: 1 }}>
        <DefaultLight />
        {/* Medalha com ~2 unidades de largura: a câmera a 4,6 deixa uma folga pequena na borda. */}
        <Camera cameraPosition={[0, 0, 4.6]} cameraTarget={[0, 0, 0]} />
        <ModelRenderer model={modelo} rotate={rotacao} multiplyWithCurrentTransform={false} />
      </FilamentView>
    </View>
  );
}
