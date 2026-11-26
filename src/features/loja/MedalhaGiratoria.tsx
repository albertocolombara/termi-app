/**
 * Medalha que gira com o dedo (vitrine da loja L1 e destaque da mala M1b).
 *
 * Em vez de 3D em tempo real (o Filament fechava o app no RN 0.88; decisão do Alberto em
 * 26/11/2026), usa o giro pré-renderizado no Blender: 25 quadros da medalha de -90° a 90°, numa
 * grade (`GIRO` no catálogo). Arrastar troca o quadro; ao soltar, a medalha volta de frente.
 * Com "reduzir movimento", volta de frente sem animar. Sem giro no catálogo, mostra a imagem 2D.
 */
import { useState } from "react";
import { AccessibilityInfo, Image, PanResponder, View } from "react-native";

import { env } from "@/config/env";
import { GIRO, quadroDoGiro, type Souvenir } from "@/domain/colecao/catalogo";
import { t } from "@/i18n";

import { Medalha } from "./Medalha";

/** Graus por ponto de arrasto: meia volta (180°) em ~300 pt. */
const GRAUS_POR_PONTO = 0.6;
const DE_FRENTE = quadroDoGiro(0);

export function MedalhaGiratoria({
  souvenir,
  tamanho,
}: {
  souvenir: Souvenir;
  tamanho: number;
}) {
  const url =
    souvenir.giro && env.tilesBaseUrl
      ? `${env.tilesBaseUrl}/${souvenir.giro}`
      : null;
  const [carregado, setCarregado] = useState(false);
  const [quadro, setQuadro] = useState(DE_FRENTE);

  // PanResponder criado uma vez; o ângulo e a volta de frente vivem dentro dele.
  const [responder] = useState(() => {
    let angulo = 0;
    let volta: number | null = null;
    const aplicar = (a: number) => {
      angulo = Math.max(-GIRO.anguloMaximo, Math.min(GIRO.anguloMaximo, a));
      setQuadro(quadroDoGiro(angulo));
    };
    const voltaDeFrente = (imediato: boolean) => {
      if (imediato) return aplicar(0);
      const de = angulo;
      const inicio = Date.now();
      const passo = () => {
        const k = Math.min(1, (Date.now() - inicio) / 500);
        aplicar(de * (1 - k) ** 3);
        if (k < 1) volta = requestAnimationFrame(passo);
      };
      volta = requestAnimationFrame(passo);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        if (volta) cancelAnimationFrame(volta);
      },
      onPanResponderMove: (_, g) => aplicar(g.dx * GRAUS_POR_PONTO),
      // "Reduzir movimento": volta de frente sem animar.
      onPanResponderRelease: () => {
        AccessibilityInfo.isReduceMotionEnabled()
          .then(voltaDeFrente)
          .catch(() => voltaDeFrente(false));
      },
      onPanResponderTerminate: () => voltaDeFrente(true),
    });
  });

  if (!url) return <Medalha souvenir={souvenir} tamanho={tamanho} />;

  const coluna = quadro % GIRO.colunas;
  const linha = Math.floor(quadro / GIRO.colunas);
  const linhas = Math.ceil(GIRO.quadros / GIRO.colunas);
  return (
    <View
      style={{ width: tamanho, height: tamanho }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={t("loja.medalhaAcessivel", { nome: souvenir.nome })}
      accessibilityHint={t("loja.arrasteParaGirar")}
      {...responder.panHandlers}
    >
      {carregado ? null : <Medalha souvenir={souvenir} tamanho={tamanho} />}
      <View
        style={{
          position: "absolute",
          width: tamanho,
          height: tamanho,
          overflow: "hidden",
          opacity: carregado ? 1 : 0,
        }}
      >
        <Image
          source={{ uri: url }}
          onLoad={() => setCarregado(true)}
          resizeMethod="none"
          style={{
            width: tamanho * GIRO.colunas,
            height: tamanho * linhas,
            transform: [
              { translateX: -coluna * tamanho },
              { translateY: -linha * tamanho },
            ],
          }}
          accessibilityIgnoresInvertColors
        />
      </View>
    </View>
  );
}
