/**
 * O Termi em Rive (ADR-12; DESIGN.md §14). Arquivo exportado do editor ("Termi Animações", artboard "Termi")
 * para assets/rive/termi.riv. A state machine é controlada pelo view model "Termi":
 *   pensando (booleano) · esteira (booleano) · novoVoo (gatilho) · embarcou (gatilho)
 *   olharX, olharY (números, em unidades do artboard): deslocam o grupo "Olhar" que envolve os olhos.
 * As animações que se encadeiam começam na mesma pose, então trocar de estado não dá salto.
 */
import { useEffect, useRef } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Rive, { AutoBind, Fit, useRive, useRiveBoolean, useRiveNumber, useRiveTrigger } from 'rive-react-native';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ARQUIVO = require('../../../assets/rive/termi.riv');

/** Duração de `termi_embarcou` (pulinho e saída pela esteira). */
export const DURACAO_EMBARCOU_MS = 2600;

export function TermiAnimado({
  esteira = false,
  pensando = false,
  embarcou = false,
  olhar,
  tamanho,
  rotulo,
  style,
}: {
  esteira?: boolean;
  pensando?: boolean;
  /** Ao virar `true`, dispara uma vez o gatilho "embarcou". */
  embarcou?: boolean;
  /** Para onde os olhos olham, em unidades do artboard (400 × 400). Ex.: até ±14 na horizontal. */
  olhar?: { x: number; y: number };
  tamanho: number;
  rotulo: string;
  style?: StyleProp<ViewStyle>;
}) {
  const [setRef, rive] = useRive();
  const [, setEsteira] = useRiveBoolean(rive, 'esteira');
  const [, setPensando] = useRiveBoolean(rive, 'pensando');
  const dispararEmbarcou = useRiveTrigger(rive, 'embarcou');
  const [, setOlharX] = useRiveNumber(rive, 'olharX');
  const [, setOlharY] = useRiveNumber(rive, 'olharY');
  const jaEmbarcou = useRef(false);

  useEffect(() => {
    if (rive) setEsteira(esteira);
  }, [rive, esteira, setEsteira]);

  useEffect(() => {
    if (rive) setPensando(pensando);
  }, [rive, pensando, setPensando]);

  const ox = olhar?.x ?? 0;
  const oy = olhar?.y ?? 0;
  useEffect(() => {
    if (!rive) return;
    setOlharX(ox);
    setOlharY(oy);
  }, [rive, ox, oy, setOlharX, setOlharY]);

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
