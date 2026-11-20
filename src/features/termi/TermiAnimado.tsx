/**
 * O Termi em Rive (ADR-12; DESIGN.md §14). Arquivo exportado do editor ("Termi Animações", artboard "Termi")
 * para assets/rive/termi.riv. A state machine é controlada pelo view model "Termi":
 *   pensando (booleano) · esteira (booleano) · novoVoo (gatilho) · embarcou (gatilho).
 * As animações que se encadeiam começam na mesma pose, então trocar de estado não dá salto.
 */
import { useEffect, useRef } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Rive, { AutoBind, Fit, useRive, useRiveBoolean, useRiveTrigger } from 'rive-react-native';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ARQUIVO = require('../../../assets/rive/termi.riv');

/** Duração de `termi_embarcou` (pulinho e saída pela esteira). */
export const DURACAO_EMBARCOU_MS = 2600;

export function TermiAnimado({
  esteira = false,
  pensando = false,
  embarcou = false,
  tamanho,
  rotulo,
  style,
}: {
  esteira?: boolean;
  pensando?: boolean;
  /** Ao virar `true`, dispara uma vez o gatilho "embarcou". */
  embarcou?: boolean;
  tamanho: number;
  rotulo: string;
  style?: StyleProp<ViewStyle>;
}) {
  const [setRef, rive] = useRive();
  const [, setEsteira] = useRiveBoolean(rive, 'esteira');
  const [, setPensando] = useRiveBoolean(rive, 'pensando');
  const dispararEmbarcou = useRiveTrigger(rive, 'embarcou');
  const jaEmbarcou = useRef(false);

  useEffect(() => {
    if (rive) setEsteira(esteira);
  }, [rive, esteira, setEsteira]);

  useEffect(() => {
    if (rive) setPensando(pensando);
  }, [rive, pensando, setPensando]);

  useEffect(() => {
    if (!rive || !embarcou || jaEmbarcou.current) return;
    jaEmbarcou.current = true;
    dispararEmbarcou?.();
  }, [rive, embarcou, dispararEmbarcou]);

  return (
    <View style={style} accessible accessibilityRole="image" accessibilityLabel={rotulo}>
      <Rive
      ref={setRef}
      source={ARQUIVO}
      artboardName="Termi"
      stateMachineName="State Machine 1"
      dataBinding={AutoBind(true)}
      fit={Fit.Contain}
      autoplay
      style={{ width: tamanho, height: tamanho }}
    />
    </View>
  );
}
