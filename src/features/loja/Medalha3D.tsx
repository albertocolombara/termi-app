/**
 * Medalha 3D na vitrine (M1b, L1): o modelo GLB do catálogo (`modelo3d`, no R2), renderizado com o
 * react-native-filament (ADR-12; virou padrão a pedido do Alberto em 25/11/2026, build-70).
 * O usuário gira com o dedo; ao soltar, a medalha volta de frente.
 *
 * Enquanto o modelo baixa (ou se falhar), aparece a medalha 2D por baixo: nada fica vazio.
 * Com "reduzir movimento", a volta de frente é imediata.
 *
 * Os GLBs vêm do Blender com a face para cima (+Y no glTF): girar 90° em X deixa a face para a câmera.
 * As rotações do Filament são aplicadas na ordem X, Y, Z (no mundo), então Y gira em torno da vertical.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { env } from '@/config/env';
import type { Souvenir } from '@/domain/colecao/catalogo';
import { t } from '@/i18n';
import { useVitrine3d } from '@/services/diagnostico';

import { Medalha } from './Medalha';

/** URL do modelo 3D, ou null se o souvenir ainda não tem. */
export function urlDoModelo(souvenir: Souvenir): string | null {
  return souvenir.modelo3d && env.tilesBaseUrl ? `${env.tilesBaseUrl}/${souvenir.modelo3d}` : null;
}

export function Medalha3D({ souvenir, tamanho }: { souvenir: Souvenir; tamanho: number }) {
  const ligada = useVitrine3d();
  // Vitrine 3D desligada (padrão enquanto o Filament fecha o app, build-72): só o render 2D.
  const url = ligada ? urlDoModelo(souvenir) : null;
  const [pronto, setPronto] = useState(false);
  return (
    <View
      style={{ width: tamanho, height: tamanho }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={t('loja.medalhaAcessivel', { nome: souvenir.nome })}
      accessibilityHint={url ? t('loja.arrasteParaGirar') : undefined}
    >
      {pronto ? null : <Medalha souvenir={souvenir} tamanho={tamanho} />}
      {url ? (
        <View style={StyleSheet.absoluteFill}>
          <CenaCarregada url={url} onPronto={() => setPronto(true)} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * O Filament só é carregado quando a vitrine 3D está ligada: desligada, nenhum código dele roda
 * (nem na importação), para isolar o fechamento da build-71/72.
 */
function CenaCarregada(props: { url: string; onPronto: () => void }) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { CenaFilament } = require('./CenaFilament') as typeof import('./CenaFilament');
  return <CenaFilament {...props} />;
}
