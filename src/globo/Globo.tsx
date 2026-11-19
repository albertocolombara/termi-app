import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas,
  DashPathEffect,
  Fill,
  ImageShader,
  Path,
  Shader,
  Skia,
  useImage,
} from '@shopify/react-native-skia';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { color, Icon, space, Text } from '@/ds';
import { motion, timing } from '@/ds/motion';
import { cameraBasis, FOV, project, sunEcef, type Camera } from './camera';
import { SKSL_GLOBO, TEX } from './shader';

const effect = Skia.RuntimeEffect.Make(SKSL_GLOBO)!;
const K = 1 / Math.tan(FOV / 2);
const RAD = Math.PI / 180;

export type Ponto = { lat: number; lon: number };
export type ModoGlobo = 'planeta' | 'seguir';

type Props = {
  width: number;
  height: number;
  /** Posição atual do avião e rumo (graus, a partir do norte). */
  aviao: Ponto & { rumo: number };
  /** Amostras do grande círculo da rota, da origem ao destino. */
  rota: Ponto[];
  /** Trecho voado (0 a 1). */
  progresso: number;
  origem: Ponto & { nome: string };
  destino: Ponto & { nome: string };
  /** planeta = de cima, norte para cima; seguir = câmera inclinada atrás do avião, no rumo dele. */
  modo: ModoGlobo;
  /** Multiplicador de aproximação (1 = padrão). */
  zoom: number;
  /** Instante (ms) para a posição do sol. */
  instante: number;
};

// Distâncias e inclinação da câmera em cada modo (km e radianos).
const CAMERA = {
  planeta: { dist: 1800, tilt: 0 },
  seguir: { dist: 700, tilt: 55 * RAD },
} as const;

/** Ângulo equivalente a `alvo` mais próximo de `atual` (evita a volta longa ao animar o rumo). */
function maisPerto(atual: number, alvo: number) {
  const d = ((((alvo - atual) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
  return atual + d;
}

/**
 * Globo do voo (ADR-11, em teste): Terra em SkSL e rota, avião e cidades desenhados por cima com a
 * mesma câmera. Só redesenha quando a câmera ou o avião mudam (a posição do avião muda 1 vez por segundo).
 */
export function Globo({ width, height, aviao, rota, progresso, origem, destino, modo, zoom, instante }: Props) {
  const dia = useImage(require('../../assets/globo/terra_dia.jpg'));
  const noite = useImage(require('../../assets/globo/terra_noite.jpg'));
  const regiao = useImage(require('../../assets/janela/base_dia.jpg'));

  const lat = useSharedValue(aviao.lat);
  const lon = useSharedValue(aviao.lon);
  const dist = useSharedValue(CAMERA[modo].dist / zoom);
  const tilt = useSharedValue(CAMERA[modo].tilt);
  const heading = useSharedValue(modo === 'seguir' ? aviao.rumo * RAD : 0);
  const sol = useSharedValue(sunEcef(instante));

  // Avião e trecho da rota (atualizados pelo relógio do voo).
  const aviaoSV = useSharedValue<Ponto & { rumo: number }>(aviao);
  const voado = useSharedValue<Ponto[]>([]);
  const restante = useSharedValue<Ponto[]>([]);

  useEffect(() => {
    sol.value = sunEcef(instante);
  }, [instante, sol]);

  useEffect(() => {
    aviaoSV.value = aviao;
    const n = rota.length - 1;
    const i = Math.max(0, Math.min(n, progresso * n));
    voado.value = [...rota.slice(0, Math.floor(i) + 1), aviao];
    restante.value = [aviao, ...rota.slice(Math.ceil(i))];
  }, [aviao, rota, progresso, aviaoSV, voado, restante]);

  // Câmera: anda junto com o avião e anima ao trocar de modo ou de zoom.
  useEffect(() => {
    const cfg = timing(motion.duration.medium4);
    lat.value = withTiming(aviao.lat, cfg);
    lon.value = withTiming(aviao.lon, cfg);
    dist.value = withTiming(CAMERA[modo].dist / zoom, cfg);
    tilt.value = withTiming(CAMERA[modo].tilt, cfg);
    heading.value = withTiming(maisPerto(heading.value, modo === 'seguir' ? aviao.rumo * RAD : 0), cfg);
  }, [aviao.lat, aviao.lon, aviao.rumo, modo, zoom, lat, lon, dist, tilt, heading]);

  const camera = useDerivedValue<Camera>(() => ({
    lat: lat.value,
    lon: lon.value,
    dist: dist.value,
    tilt: tilt.value,
    heading: heading.value,
  }));

  const uniforms = useDerivedValue(() => {
    const b = cameraBasis(camera.value);
    return { res: [width, height], cp: b.pos, cf: b.f, cr: b.right, cu: b.up, k: K, sunD: sol.value };
  });

  const pathVoado = useCaminho(camera, voado, width, height);
  const pathRestante = useCaminho(camera, restante, width, height);

  const estiloAviao = useAnimatedStyle(() => {
    const b = cameraBasis(camera.value);
    const a = aviaoSV.value;
    const s = project(a.lat, a.lon, b, width, height);
    if (!s) return { opacity: 0 };
    // Rumo na tela: projeta um ponto 20 km à frente.
    const dLat = (20 / 111.2) * Math.cos(a.rumo * RAD);
    const dLon = ((20 / 111.2) * Math.sin(a.rumo * RAD)) / Math.cos(a.lat * RAD);
    const f = project(a.lat + dLat, a.lon + dLon, b, width, height);
    const ang = f ? Math.atan2(f[1] - s[1], f[0] - s[0]) : 0;
    return {
      opacity: 1,
      transform: [{ translateX: s[0] - AVIAO / 2 }, { translateY: s[1] - AVIAO / 2 }, { rotate: `${ang}rad` }],
    };
  });

  const estiloOrigem = useRotulo(camera, origem, width, height);
  const estiloDestino = useRotulo(camera, destino, width, height);

  const pronto = !!dia && !!noite && !!regiao;
  const rects = useMemo(
    () => ({
      dia: { x: 0, y: 0, width: TEX.dia.w, height: TEX.dia.h },
      noite: { x: 0, y: 0, width: TEX.noite.w, height: TEX.noite.h },
      regiao: { x: 0, y: 0, width: TEX.regiao.w, height: TEX.regiao.h },
    }),
    [],
  );

  return (
    <View style={{ width, height, backgroundColor: color.bg.flight }}>
      {pronto && (
        <Canvas style={StyleSheet.absoluteFill}>
          <Fill>
            <Shader source={effect} uniforms={uniforms}>
              <ImageShader image={dia} tx="repeat" ty="clamp" fit="fill" rect={rects.dia} />
              <ImageShader image={noite} tx="repeat" ty="clamp" fit="fill" rect={rects.noite} />
              <ImageShader image={regiao} tx="clamp" ty="clamp" fit="fill" rect={rects.regiao} />
            </Shader>
          </Fill>
          <Path path={pathRestante} style="stroke" strokeWidth={2} strokeCap="round" color={color.text.secondary}>
            <DashPathEffect intervals={[2, 6]} />
          </Path>
          <Path path={pathVoado} style="stroke" strokeWidth={3} strokeCap="round" strokeJoin="round" color={color.accent.default} />
        </Canvas>
      )}

      <Animated.View pointerEvents="none" style={[styles.ponto, estiloOrigem]}>
        <View style={styles.pontoMarca} />
        <Text variant="Label/Medium 14" style={styles.pontoTexto}>
          {origem.nome}
        </Text>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.ponto, estiloDestino]}>
        <View style={styles.pontoMarca} />
        <Text variant="Label/Medium 14" style={styles.pontoTexto}>
          {destino.nome}
        </Text>
      </Animated.View>

      <Animated.View pointerEvents="none" style={[styles.aviao, estiloAviao]}>
        <View style={styles.halo} />
        <Icon name="plane" size={28} color={color.accent.default} />
      </Animated.View>
    </View>
  );
}

/** Linha da rota projetada na tela; quebra onde a rota passa para trás do globo. */
function useCaminho(camera: SharedValue<Camera>, pontos: SharedValue<Ponto[]>, w: number, h: number) {
  return useDerivedValue(() => {
    const b = cameraBasis(camera.value);
    const p = Skia.PathBuilder.Make();
    let aberto = false;
    for (const pt of pontos.value) {
      const s = project(pt.lat, pt.lon, b, w, h);
      if (!s) {
        aberto = false;
        continue;
      }
      if (aberto) p.lineTo(s[0], s[1]);
      else p.moveTo(s[0], s[1]);
      aberto = true;
    }
    return p.detach();
  });
}

/** Posição na tela de uma cidade (some quando fica atrás do globo). */
function useRotulo(camera: SharedValue<Camera>, ponto: Ponto, w: number, h: number) {
  const { lat, lon } = ponto;
  return useAnimatedStyle(() => {
    const s = project(lat, lon, cameraBasis(camera.value), w, h);
    if (!s) return { opacity: 0 };
    return { opacity: 1, transform: [{ translateX: s[0] - PONTO / 2 }, { translateY: s[1] - PONTO / 2 }] };
  });
}

const AVIAO = 44;
const PONTO = 10;

const styles = StyleSheet.create({
  aviao: { position: 'absolute', left: 0, top: 0, width: AVIAO, height: AVIAO, alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute',
    width: AVIAO,
    height: AVIAO,
    borderRadius: AVIAO / 2,
    backgroundColor: color.accent.default,
    opacity: 0.25,
  },
  ponto: { position: 'absolute', left: 0, top: 0, flexDirection: 'row', alignItems: 'center', gap: space[6] },
  pontoMarca: { width: PONTO, height: PONTO, borderRadius: PONTO / 2, backgroundColor: color.text.primary },
  pontoTexto: { textShadowColor: color.bg.flight, textShadowRadius: 4 },
});
