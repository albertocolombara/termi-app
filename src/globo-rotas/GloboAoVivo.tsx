/**
 * Globo pontilhado "ao vivo" do onboarding (Figma "Onboarding · v3"): o mesmo globo preto do Início
 * (shader e geometria de `GloboDeRotas`), só para ver, sem toque.
 *
 * - `avioes`: aviões reais no ar (posição projetada do cache), desenhados no rumo deles (OB1).
 * - `destaque`: um voo real com a rota em amarelo, o avião amarelo e uma etiqueta que o acompanha (OB1).
 * - `rotas`: rotas que "passam": cada arco se desenha da origem ao destino e some, em ciclos
 *   defasados, enquanto o globo gira (OB7).
 *
 * Gira devagar sozinho; com "reduzir movimento", fica parado e as rotas aparecem inteiras.
 * Fora de foco (`ativo` falso) o quadro para.
 */
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Fill, ImageShader, LinearGradient, Picture, Rect, Shader, Skia, createPicture, useImage, vec } from '@shopify/react-native-skia';
import Animated, { useAnimatedStyle, useDerivedValue, useFrameCallback, useReducedMotion, useSharedValue } from 'react-native-reanimated';

import { color, radius, space, Text } from '@/ds';

import { arcoNaTela, centroDaRota, escondido, projetar, slerp, vetor, type Vec3 } from './geometria';
import { MASCARA, SKSL_GLOBO_DE_ROTAS } from './shader';

const efeito = Skia.RuntimeEffect.Make(SKSL_GLOBO_DE_ROTAS)!;
const RAD = Math.PI / 180;
const LINHAS = 230;
const TILT_PADRAO = 20 * RAD;
/** Giro automático (rad/s). */
const GIRO = 0.05;
/** Uma rota leva isso para se desenhar inteira; depois fica um pouco e some. */
const CICLO_DA_ROTA_S = 4.2;
const VINHETA_V = 0.2;
const VINHETA_H = 0.08;

/** Ícone "plane" do DS (caixa 21 × 21, bico para a direita); centrado no desenho. */
const CAMINHO_DO_AVIAO = Skia.Path.MakeFromSVGString(
  'M7 18.6667L8.66667 18.6667L12.8333 11.5833L17.4167 11.5833C18.1083 11.5833 18.6667 11.025 18.6667 10.3333C18.6667 9.64167 18.1083 9.08333 17.4167 9.08333L12.8333 9.08333L8.66667 2L7.00001 2L9.08334 9.08333L4.50001 9.08333L3.25001 7L2.00001 7L2.83334 10.3333L2.00001 13.6667L3.25001 13.6667L4.50001 11.5833L9.08334 11.5833L7 18.6667Z',
)!;

export type AviaoNoGlobo = { lat: number; lon: number; rumo: number };
export type RotaNoGloboAoVivo = { origem: { lat: number; lon: number }; destino: { lat: number; lon: number } };

export type GloboAoVivoProps = {
  largura: number;
  altura: number;
  avioes?: AviaoNoGlobo[];
  destaque?: RotaNoGloboAoVivo & { aviao: AviaoNoGlobo; rotulo: string } | null;
  rotas?: RotaNoGloboAoVivo[];
  /** Centro inicial da câmera (graus). Padrão: o destaque, ou o Atlântico. */
  centro?: { lat: number; lon: number };
  /** Raio do globo em relação ao menor lado da área. */
  raioRelativo?: number;
  ativo?: boolean;
  rotuloAcessivel: string;
};

/** Ponto a `d` graus de distância no rumo dado (para saber a direção do avião na tela). */
function aFrente(lat: number, lon: number, rumo: number, d: number): Vec3 {
  'worklet';
  const la = lat * RAD;
  const lo = lon * RAD;
  const b = rumo * RAD;
  const dr = d * RAD;
  const la2 = Math.asin(Math.sin(la) * Math.cos(dr) + Math.cos(la) * Math.sin(dr) * Math.cos(b));
  const lo2 = lo + Math.atan2(Math.sin(b) * Math.sin(dr) * Math.cos(la), Math.cos(dr) - Math.sin(la) * Math.sin(la2));
  return vetor(la2 / RAD, lo2 / RAD);
}

export function GloboAoVivo({ largura, altura, avioes = [], destaque = null, rotas = [], centro, raioRelativo = 0.42, ativo = true, rotuloAcessivel }: GloboAoVivoProps) {
  const mascara = useImage(require('../../assets/globo/terra-mascara.png'));
  const reduzir = useReducedMotion();

  const cx = largura / 2;
  const cy = altura / 2;
  const raio = Math.min(largura, altura) * raioRelativo;

  const inicio = useMemo(() => {
    if (centro) return { yaw: centro.lon * RAD, tilt: Math.max(-0.9, Math.min(0.9, centro.lat * RAD)) };
    if (destaque) {
      const c = centroDaRota(vetor(destaque.origem.lat, destaque.origem.lon), vetor(destaque.destino.lat, destaque.destino.lon));
      return { yaw: c.yaw, tilt: c.tilt };
    }
    return { yaw: -25 * RAD, tilt: TILT_PADRAO };
    // Só no início: o globo não pula quando os aviões chegam.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const yaw = useSharedValue(inicio.yaw);
  const tilt = useSharedValue(inicio.tilt);
  const tempo = useSharedValue(0);
  const avioesSV = useSharedValue<AviaoNoGlobo[]>(avioes);
  const destaqueSV = useSharedValue(destaque);
  const rotasSV = useSharedValue<{ a: Vec3; b: Vec3 }[]>([]);
  useEffect(() => {
    avioesSV.set(avioes);
  }, [avioes, avioesSV]);
  useEffect(() => {
    destaqueSV.set(destaque);
  }, [destaque, destaqueSV]);
  useEffect(() => {
    rotasSV.set(rotas.map((r) => ({ a: vetor(r.origem.lat, r.origem.lon), b: vetor(r.destino.lat, r.destino.lon) })));
  }, [rotas, rotasSV]);

  // Com destaque o globo fica parado nele (a etiqueta precisa ficar legível); sem, gira devagar.
  const gira = !destaque && !reduzir;
  const quadro = useFrameCallback((info) => {
    'worklet';
    const dt = Math.min(0.05, (info.timeSincePreviousFrame ?? 16) / 1000);
    tempo.set(tempo.get() + dt);
    if (gira) yaw.set(yaw.get() - GIRO * dt);
  }, false);
  useEffect(() => {
    quadro.setActive(ativo && (gira || rotas.length > 0) && !reduzir);
  }, [ativo, gira, rotas.length, reduzir, quadro]);

  const cores = useMemo(
    () => ({
      corTerra: [...Skia.Color(color.globo.terra)].slice(0, 3).concat(0.95),
      corMarCentro: [...Skia.Color(color.globo.marCentro)],
      corMarBorda: [...Skia.Color(color.globo.marBorda)],
      corHalo: [...Skia.Color(color.globo.halo)],
    }),
    [],
  );
  const uniforms = useDerivedValue(() => ({ centro: [cx, cy], raio, yaw: yaw.get(), tilt: tilt.get(), linhas: LINHAS, ...cores }));

  const desenho = useDerivedValue(() => {
    const y = yaw.get();
    const tl = tilt.get();
    const t = tempo.get();
    const lista = avioesSV.get();
    const d = destaqueSV.get();
    const arcos = rotasSV.get();
    return createPicture((canvas) => {
      const linha = Skia.Paint();
      linha.setAntiAlias(true);
      linha.setStyle(1);
      linha.setStrokeCap(1);
      linha.setColor(Skia.Color(color.accent.default));
      const tinta = Skia.Paint();
      tinta.setAntiAlias(true);

      const desenharAviao = (a: AviaoNoGlobo, cor: string, tamanho: number) => {
        const p = projetar(vetor(a.lat, a.lon), 1, y, tl, cx, cy, raio);
        if (p.z < 0.08) return;
        const q = projetar(aFrente(a.lat, a.lon, a.rumo, 1.5), 1, y, tl, cx, cy, raio);
        const ang = Math.atan2(q.y - p.y, q.x - p.x);
        tinta.setColor(Skia.Color(cor));
        tinta.setAlphaf(Math.min(1, p.z * 3));
        canvas.save();
        canvas.translate(p.x, p.y);
        canvas.rotate((ang * 180) / Math.PI, 0, 0);
        canvas.scale(tamanho / 21, tamanho / 21);
        canvas.translate(-10.33, -10.33);
        canvas.drawPath(CAMINHO_DO_AVIAO, tinta);
        canvas.restore();
      };

      // Rotas que passam (OB7): cada uma se desenha e some, defasadas.
      for (let i = 0; i < arcos.length; i++) {
        const fase = reduzir ? 0.7 : ((t / CICLO_DA_ROTA_S + i / Math.max(1, arcos.length)) % 1);
        const u = Math.min(1, fase / 0.6);
        const alfa = fase < 0.75 ? 1 : 1 - (fase - 0.75) / 0.25;
        const pts = arcoNaTela(arcos[i].a, arcos[i].b, y, tl, cx, cy, raio);
        const ate = Math.max(1, Math.round(u * (pts.length - 1)));
        const caminho = Skia.PathBuilder.Make();
        for (let k = 0; k < ate; k++) {
          if (escondido(pts[k]) || escondido(pts[k + 1])) continue;
          caminho.moveTo(pts[k].x, pts[k].y);
          caminho.lineTo(pts[k + 1].x, pts[k + 1].y);
        }
        linha.setStrokeWidth(1.4);
        linha.setAlphaf(0.75 * alfa);
        canvas.drawPath(caminho.detach(), linha);
        const cabeca = pts[ate];
        if (!escondido(cabeca) && u < 1) {
          tinta.setColor(Skia.Color(color.accent.default));
          tinta.setAlphaf(alfa);
          canvas.drawCircle(cabeca.x, cabeca.y, 2.4, tinta);
        }
      }

      // Aviões no ar agora (OB1).
      for (let i = 0; i < lista.length; i++) desenharAviao(lista[i], color.text.primary, 11);

      // Voo em destaque: rota amarela, pontas e avião amarelo.
      if (d) {
        const a = vetor(d.origem.lat, d.origem.lon);
        const b = vetor(d.destino.lat, d.destino.lon);
        const pts = arcoNaTela(a, b, y, tl, cx, cy, raio);
        // O arco é achatado (sem altura): o avião fica em cima da linha.
        const chao = Skia.PathBuilder.Make();
        for (let k = 0; k <= 40; k++) {
          const p = projetar(slerp(a, b, k / 40), 1, y, tl, cx, cy, raio);
          if (p.z < 0) continue;
          if (k === 0 || projetar(slerp(a, b, (k - 1) / 40), 1, y, tl, cx, cy, raio).z < 0) chao.moveTo(p.x, p.y);
          else chao.lineTo(p.x, p.y);
        }
        linha.setStrokeWidth(1.2);
        linha.setAlphaf(0.9);
        canvas.drawPath(chao.detach(), linha);
        tinta.setColor(Skia.Color(color.accent.default));
        for (const ponta of [pts[0], pts[pts.length - 1]]) {
          if (ponta.z < 0) continue;
          tinta.setAlphaf(1);
          canvas.drawCircle(ponta.x, ponta.y, 2.6, tinta);
        }
        desenharAviao(d.aviao, color.accent.default, 17);
      }
    });
  });

  // Etiqueta do voo em destaque: acompanha o avião, à esquerda dele.
  const estiloDaEtiqueta = useAnimatedStyle(() => {
    const d = destaqueSV.get();
    if (!d) return { opacity: 0 };
    const p = projetar(vetor(d.aviao.lat, d.aviao.lon), 1, yaw.get(), tilt.get(), cx, cy, raio);
    if (p.z < 0.1) return { opacity: 0 };
    return { opacity: 1, transform: [{ translateX: Math.max(4, p.x - 168) }, { translateY: p.y - 34 }] };
  });

  const vinheta = useMemo(() => {
    const opaco = Skia.Color(color.bg.app);
    const transparente = Float32Array.from(opaco);
    transparente[3] = 0;
    return [opaco, transparente];
  }, []);
  const vv = altura * VINHETA_V;
  const vh = largura * VINHETA_H;

  return (
    <View style={{ width: largura, height: altura }} pointerEvents="none" accessible={!!rotuloAcessivel} accessibilityRole="image" accessibilityLabel={rotuloAcessivel}>
      {mascara ? (
        <Canvas style={StyleSheet.absoluteFill}>
          <Fill>
            <Shader source={efeito} uniforms={uniforms}>
              <ImageShader image={mascara} tx="repeat" ty="clamp" fit="fill" rect={{ x: 0, y: 0, width: MASCARA.w, height: MASCARA.h }} />
            </Shader>
          </Fill>
          <Picture picture={desenho} />
          <Rect x={0} y={0} width={largura} height={vv}>
            <LinearGradient start={vec(0, 0)} end={vec(0, vv)} colors={vinheta} />
          </Rect>
          <Rect x={0} y={altura - vv} width={largura} height={vv}>
            <LinearGradient start={vec(0, altura)} end={vec(0, altura - vv)} colors={vinheta} />
          </Rect>
          <Rect x={0} y={0} width={vh} height={altura}>
            <LinearGradient start={vec(0, 0)} end={vec(vh, 0)} colors={vinheta} />
          </Rect>
          <Rect x={largura - vh} y={0} width={vh} height={altura}>
            <LinearGradient start={vec(largura, 0)} end={vec(largura - vh, 0)} colors={vinheta} />
          </Rect>
        </Canvas>
      ) : null}
      {destaque?.rotulo ? (
        <Animated.View style={[styles.etiqueta, estiloDaEtiqueta]}>
          <Text variant="Caption/Medium 12" tone="secondary" numberOfLines={1} style={styles.textoDaEtiqueta}>
            {destaque.rotulo}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Figma "Etiqueta · voo ao vivo": scrim com borda clara, texto de ~9 pt.
  etiqueta: {
    position: 'absolute',
    left: 0,
    top: 0,
    maxWidth: 160,
    paddingHorizontal: space[6],
    paddingVertical: space[2],
    borderRadius: radius.sm,
    borderWidth: 0.75,
    borderColor: color.border.default,
    backgroundColor: color.bg.scrim,
  },
  textoDaEtiqueta: { fontSize: 9, lineHeight: 12 },
});
